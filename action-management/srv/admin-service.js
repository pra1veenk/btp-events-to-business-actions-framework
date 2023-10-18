const cds = require("@sap/cds");
const destinationUtil = require('./utils/destination');
// eslint-disable-next-line no-unused-vars
const llmUtil = require('./utils/llm-management');
const { v4: uuidv4 } = require('uuid');

module.exports = cds.service.impl(async function (srv) {

    const { Destinations, Actions, Types, LogStatuses, prepostActions } = this.entities;

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

    srv.on('getActionSuggestionsFromLLM1', async (req) => {
        try{
                const userInput = req.data.userInput;
                console.log('user input: '+userInput);
                console.log("------------------Start of generating topic suggestions-------");
                //const response = await llmUtil.callLLMService(prompt);
                const response = {
                    "MAIN": {
                        "Action_Payload": 
                        {  
                            "PurchaseRequisitionType": "NB",  
                            "PurReqnDescription": "Purchase Requisition for Pump Material",  
                            "to_PurchaseReqnItem": [    {      
                                "PurchaseRequisitionItemText": "Pump Material",      
                                "Material": "PUMP_MAT",      
                                "Plant": "1000",      
                                "Quantity": 2,      
                                "DeliveryDate": "2022-12-31"    
                            }  ]
                        },
                        "Field_Description": "create pr description of fields",
                        "Action_Type": "POST",
                        "Relative_Path": "/A_PurchaseRequisition",
                        "Suggested_Action_Name": "Create_Purchase_Requisition"
                    },
                    "POST": {
                        "Action_Payload": 
                        {  
                            "PurchaseRequisitionType": "NB",  
                            "PurReqnDescription": "Purchase Requisition for Pump Material",  
                            "to_PurchaseReqnItem": [    {      
                                "PurchaseRequisitionItemText": "Pump Material",      
                                "Material": "PUMP_MAT",      
                                "Plant": "1000",      
                                "Quantity": 2,      
                                "DeliveryDate": "2022-12-31"    
                            }  ]
                        },
                        "Field_Description": "create pr description of fields",
                        "Action_Type": "POST",
                        "Relative_Path": "/A_PurchaseRequisition",
                        "Suggested_Action_Name": "Create_Purchase_Requisition"
                    },
                    "PRE": {
                        "Action_Payload": 
                        {  
                            "PurchaseRequisitionType": "NB",  
                            "PurReqnDescription": "Purchase Requisition for Pump Material",  
                            "to_PurchaseReqnItem": [    {      
                                "PurchaseRequisitionItemText": "Pump Material",      
                                "Material": "PUMP_MAT",      
                                "Plant": "1000",      
                                "Quantity": 2,      
                                "DeliveryDate": "2022-12-31"    
                            }  ]
                        },
                        "Field_Description": "create pr description of fields",
                        "Action_Type": "POST",
                        "Relative_Path": "/A_PurchaseRequisition",
                        "Suggested_Action_Name": "Create_Purchase_Requisition"
                    }
                }
                    
                console.log("------------------End of generating topic suggestions------- response is : "+response);
                return JSON.stringify(response);
        } catch(err){
            console.log("Error occured while generating suggestions from LLM"+err);
            req.reject(500, "Error occured while generating suggestions from LLM. Please try again after sometime.");
        }
    })

    //method to create action and return action id
    async function createAction(action, actionType, actionId){
        //post id 4eaa8eda-1329-4cb8-8d19-174c2e06cd3f get this dymanically and use for creation
        const methodId = "4eaa8eda-1329-4cb8-8d19-174c2e06cd3f"
        const response = await INSERT.into(Actions).entries({
            "ID": actionId,
            "name": action["Suggested_Action_Name"],
            "descr": "This action is created using LLM "+action["Suggested_Action_Name"],
            "path": action["Relative_Path"],
            "method_ID": methodId,
            "payload": JSON.stringify(action.Action_Payload),
            "type_ID":"809e3149-0e99-4cb3-8119-a2e840284e88",
            "contentType_id": "JSON",
            "actionCategory_id": actionType,
            "isCsrfTokenNeeded": true,
            "apidescription": action["Field_Description"]
        });
        console.log(response);
    }

    async function chainAction(helperActionType,mainActionId,helperActionId){
        const helperActionTypeId = helperActionType === "PRE"?"5afa4651-b380-4ece-b668-6b1a27bbc2b0":"6be2eb90-575a-4e28-92d2-53488b49fbf6"
        const actionMappingId = uuidv4();
        const response = await INSERT.into(prepostActions).entries({
            "ID": actionMappingId,
            "flowType_ID": helperActionTypeId,
            "rootAction_ID": mainActionId,
            "action_ID": helperActionId
        });
        console.log(response);
    }

    srv.on('createActions', async (req) => {
        try{
            const actionsInput = req.data.actionsInput;
            const actions = JSON.parse(actionsInput);
            //get and create pre action if exists
            const preAction = actions["PRE"];
            let preActionId;
            let mainActionId;
            let postActionId;
            if ("Action_Payload" in preAction){
                preActionId = uuidv4();
                let response = await createAction(preAction,"CHILD",preActionId);
            }
            //create main action
            const mainAction = actions["MAIN"];
            if ("Action_Payload" in mainAction){
                mainActionId = uuidv4();
                let response = await createAction(mainAction,"ROOT",mainActionId);
            }
            //create post action if exists
            const postAction = actions["POST"];
            if ("Action_Payload" in postAction){
                postActionId = uuidv4();
                let response = await createAction(postAction,"CHILD",postActionId);
            }
            //link pre and post actions to main action if created successfully
            
            if(preActionId){
                let response = await chainAction("PRE",mainActionId,preActionId);
            }
            if(postActionId){
                let response = await chainAction("POST",mainActionId,postActionId);
            }
            return "Actions created successfully."
        } catch(err){
            console.log("Error occured while creating actions"+err);
            req.reject(500, "Error occured while creating actions. Please try again after sometime.");
        }
        
    })
    

})
