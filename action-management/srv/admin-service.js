const cds = require("@sap/cds");
const destinationUtil = require('./utils/destination');
// eslint-disable-next-line no-unused-vars
const llmUtil = require('./utils/llm-management');

module.exports = cds.service.impl(async function (srv) {

    const { Destinations, Actions, Types, LogStatuses } = this.entities;

    srv.on('READ', Destinations, async (req) => {
        try {
            let searchString = req.query.SELECT.search === undefined ? '' : req.query.SELECT.search[0].val;
            return await destinationUtil.getAllDestinations(searchString);
        } catch (error) {
            console.log(error);
            throw error
        }
    });

    srv.on('READ', LogStatuses, async () => {
        return [{ id: 'INPROCESS', descr: 'In Process' }, { id: 'ERROR', descr: 'Error' }, { id: 'COMPLETE', descr: 'Completed' }]
    });

    srv.after('READ', Actions, async (data, req) => {
        let actionCategoryID = '';
        if ((req._.event === 'READ' || req._.event === 'EDIT') && !Array.isArray(data)) {
            if (data.actionCategory_id == undefined) {
                let actionId = data.ID === undefined ? req.data.ID : data.ID;
                let result = await cds.read(Actions.drafts).limit(1).where({ ID: actionId }).columns(['actionCategory_id']);
                result.length > 0 ? actionCategoryID = result[0].actionCategory_id : '';
            } else {
                actionCategoryID = data.actionCategory_id;
            }
            actionCategoryID == 'ROOT' ? data.hideChildActions = false : data.hideChildActions = true;
            actionCategoryID == 'DEFAULT' ? data.hideDefaultActionIdPath = false : data.hideDefaultActionIdPath = true;
        }
        return data;
    })

    srv.before('PATCH', Actions, async (req) => {
        try {
            if (req.data.dest !== undefined) {
                let aDestinationInfo = await destinationUtil.getAllDestinations(req.data.dest);
                if (aDestinationInfo != undefined){
                    if(aDestinationInfo.length == 1) req.data.url = aDestinationInfo[0].url
                    else req.data.url = '';
                }
            }
            if (req.data.type_ID !== undefined && req.data.type_ID !== null) {
                let result = await cds.read(Types).where({ ID: req.data.type_ID });
                req.data.path = result[0].path;
                req.data.payload = result[0].payload;
                req.data.method_ID = result[0].method_ID;
                req.data.contentType_id = result[0].contentType_id;
            } else if (req.data.type_ID === null) {
                req.data.path = req.data.payload = req.data.method_ID = req.data.contentType_id = '';
            }
            if(req.data.actionCategory_id == 'DEFAULT' && req.data.ID !== undefined){
                let result = await cds.read(Actions).where({actionCategory_id: 'DEFAULT'});
                if(result && result.length>0 && result[0].ID != req.data.ID){
                    req.reject(501, 'Only one default action can be created');
                }
            }
        } catch (error) {
            console.log(error);
            throw error
        }
    });

    srv.on('getUrlByDestination', Actions, async (req) => {
        // console.log('==> POST getUrlByDestination Called')
        const query = SELECT.one.from(Actions.drafts).where(req.params[0]), tx = srv.tx(req);
        let response = await tx.run(query);
        // console.log(JSON.stringify(response));
        // console.log('POST call finished <==')
        return response;
    });

    srv.on('getRelatedActionsVisibility', Actions, async (req) => {
        let response = await cds.read(Actions.drafts).where(req.params[0]);
        if (response[0].actionCategory_id == 'ROOT') {
            return true;
        } else {
            return false;
        }
    })

    srv.on('postEvent', async (req) => {
        console.log('event received from advanced event mesh');
        console.log(req);
        console.log(req.data);
    })

    srv.on('getActionsDefaults', async () => {
        return { actionCategory_id: 'ROOT', contentType_id: 'JSON', isCsrfTokenNeeded: false };
    })

    srv.on('getActionSuggestionsFromLLM',Actions, async (req) => {
        try{
                const action_uuid = req.getUriInfo()._pathSegments[0]._keyPredicates[0]._value;
                const userInput = req.data.userInput;
                console.log('user input: '+userInput);
                console.log("------------------Start of generating topic suggestions-------");
                //const response = await llmUtil.callLLMService(prompt);
                const response = {
                    "payload":{
                        "PurchaseRequisitionType": "NB",
                        "PurReqnDescription": "Requisition for pump material",
                        "to_PurchaseReqnItem": {
                        "results": [
                        {
                        "PurchaseRequisitionItem": "10",
                        "Material": "PUMP_MATERIAL",
                        "Plant": "1000",
                        "RequestedQuantity": "5",
                        "DeliveryDate": "/Date(1643731200000)/",
                        "PurchaseRequisitionPrice": "500",
                        "PurReqnPriceQuantity": "1",
                        "BaseUnit": "EA"
                        }
                        ]
                        }
                    },
                    "apidescription": `In this JSON payload:
                    - PurchaseRequisitionType is the document type for the purchase requisition. "NB" stands for Purchase Requisition.
                    - PurReqnDescription is the description of the purchase requisition.
                    - to_PurchaseReqnItem is an array of items in the purchase requisition. Each item is an object with the following
                    properties:
                    - PurchaseRequisitionItem is the item number of the purchase requisition.
                    - Material is the material number. In this case, it's "PUMP_MATERIAL".
                    - Plant is the plant where the material is required.
                    - RequestedQuantity is the quantity of the material required.
                    - DeliveryDate is the required delivery date of the material. The date is in Unix timestamp format.
                    - PurchaseRequisitionPrice is the price of the material in the purchase requisition.
                    - PurReqnPriceQuantity is the quantity for which the price is applicable.
                    - BaseUnit is the unit of measure for the material. "EA" stands for Each.`
                }
                console.log("------------------End of generating topic suggestions------- response is : "+response);
                const  result = await UPDATE.entity(Actions.drafts, action_uuid).set({payload:JSON.stringify(response.payload),apidescription: response.apidescription});
                console.log(result);
                return response;
        } catch(err){
            console.log("Error occured while generating suggestions from LLM"+err);
            req.reject(500, "Error occured while generating suggestions from LLM. Please try again after sometime.");
        }
    })

})
