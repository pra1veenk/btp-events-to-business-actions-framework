/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
sap.ui.define(["sap/m/MessageBox", "sap/m/MessageToast",  "sap/ui/model/json/JSONModel", "sap/f/library"], 
function (MessageBox, MessageToast, JSONModel, fioriLibrary){
    let bFragmentLoaded=false;
    let llmResponse = "";
    "use strict";
    function _createUploadController(oExtensionAPI) {
        var oUploadDialog;

        function setDialogBusy(bBusy) {
            oUploadDialog.setBusy(bBusy);
        }

        function showError(sMessage) {
            MessageBox.error(sMessage || "Upload failed");
        }

        return {
            prepareTopicSuggestions: function (data) {
                console.log(data);
            },
            onBeforeOpen: function (oEvent) {
                oUploadDialog = oEvent.getSource();
                oExtensionAPI.addDependent(oUploadDialog);
                // if(oUploadDialog.getId().includes("Topics")==true){
                //     let oVBox = oUploadDialog.getAggregation("content")[0];
                //     let oTable = oVBox.getAggregation("items")[0];
                //     oTable.setBusyIndicatorDelay(0).setBusy(true);
                //     let sParticipantId = oVBox.getParent().getBindingContext().getPath().split('(')[1].split(')')[0];
                //     let oOperation = oVBox.getObjectBinding();
                //     oOperation.setParameter("participantId", sParticipantId).execute().then(function(event){
                //         let oResults = oOperation.getBoundContext().getObject();
                //         let oTopicModel = new JSONModel({value:oResults.value, error_visible:false});
                //         oTable.setModel(oTopicModel, "topicsuggestions");
                //         oTable.setBusyIndicatorDelay(0).setBusy(false);
                //         console.log(oResults);
                //     }).catch(function(error){
                //         let oTopicModel = new JSONModel({value:[], error_visible: true, error_message:error.message});
                //         oTable.setModel(oTopicModel, "topicsuggestions");
                //         oTable.setBusyIndicatorDelay(0).setBusy(false);
                //         console.log(oResults);
                //     })
                // }
            },

            onTopicOk: function (oEvent) {
                oUploadDialog && oUploadDialog.close();
            },

            onListItemPress: function(oEvent){
                this.fcl.setLayout(fioriLibrary.LayoutType.TwoColumnsMidExpanded);
                let idSplitList = oEvent.getParameters()["id"].split('-');
                let index = parseInt(idSplitList[idSplitList.length-1]);
                // debugger;
                let LLMItem = oEvent.getSource().getModel("LLM").getData().Actions[index];
                LLMItem = JSON.parse(JSON.stringify(LLMItem));
                LLMItem.Action_Payload = JSON.stringify(LLMItem.Action_Payload, null, "\t")
                let oLLMItemModel = new JSONModel({Action: LLMItem});
                this.detailPage.setModel(oLLMItemModel, "LLMItem");
                // var oFCL = this.oView.getParent().getParent();
                // oFCL.setLayout(fioriLibrary.LayoutType.TwoColumnsMidExpanded);
                // this.detailPage.getAggregation("content").getAggregation("items")[2].getAggregation("items")[1].prettyPrint()
            },

            onGetActionsFromLLM: function(oEvent) {
                // let oVBox = oEvent.getSource().getParent();
                // let oTextAreaInput = oVBox.getAggregation("items")[0];
                let oVBox = oEvent.getSource().getParent();
                let oTextAreaInput = oVBox.getAggregation("content")[0];
                const userInputForLLM = oTextAreaInput.getValue();
                console.log(userInputForLLM);

                //call llm and get suggested actions
                let oDialog1 = oVBox.getParent();
                // let oHBox = oDialog1.getAggregation("content")[1];
                let oHBox = oVBox.getAggregation("content")[3];
                let oOperation = oHBox.getObjectBinding();

                // this.fcl = oDialog1.getAggregation("content")[0].getAggregation("items")[2]
                this.fcl = oVBox.getAggregation("content")[2].getAggregation("items")[0]
                this.beginPage = this.fcl.getAggregation("beginColumnPages")[0];
                this.detailPage = this.fcl.getAggregation("midColumnPages")[0];
                this.oDialog = oVBox;
                var that = this;
                this.oDialog.setBusy(true);
                oOperation.setParameter("userInput", userInputForLLM).execute().then(function(event){
                    let oResults = oOperation.getBoundContext().getObject();
                    //let oTopicModel = new JSONModel({value:oResults.value, error_visible:false});
                    //oTable.setModel(oTopicModel, "topicsuggestions");
                    //oTable.setBusyIndicatorDelay(0).setBusy(false);
                    let idTextAreaActions = oHBox.getAggregation("items")[0];
                    idTextAreaActions.setValue(oResults.value);
                    idTextAreaActions.setVisible(false);
                    console.log(oResults);
                    //update this
                    llmResponse = oResults.value;
                    let aActionsList=[], result= JSON.parse(oResults.value);
                    if(result.PRE) aActionsList.push(result.PRE);
                    if(result.MAIN) aActionsList.push(result.MAIN);
                    if(result.POST) aActionsList.push(result.POST);
                    let oLLMModel = new JSONModel({Actions: aActionsList});
                    that.beginPage.setModel(oLLMModel, "LLM");
                    that.beginPage.setVisible(true);
                    that.oDialog.setBusy(false);
                    console.log(that);
                }).catch(function(error){
                    let oErrors = new JSONModel({value:[], error_visible: true, error_message:error.message});
                    console.log(oErrors);
                })
                //let suggestedActions = 
            },
            oncreateActions: function(oEvent) {
                /*
                let oDialog1 = oEvent.getSource().getParent();
                let oVBox = oDialog1.getAggregation("content")[1];
                let oTextAreaActions = oVBox.getAggregation("items")[0];
                const actionsInput = oTextAreaActions.getValue();
                console.log(actionsInput);
                */
                //call create action and get output
                let oDialog1 = oEvent.getSource().getParent();
                let oDummyVBox = oDialog1.getAggregation("content")[4];
                const actionsInput = llmResponse;
                let oOperation = oDummyVBox.getObjectBinding();
                var that = this;
                this.oDialog.setBusy(true);
                oOperation.setParameter("actionsInput", actionsInput).execute().then(function(event){
                    let oResults = oOperation.getBoundContext().getObject();
                    //let oTopicModel = new JSONModel({value:oResults.value, error_visible:false});
                    //oTable.setModel(oTopicModel, "topicsuggestions");
                    //oTable.setBusyIndicatorDelay(0).setBusy(false);
                    console.log(oResults);
                    oExtensionAPI.refresh();
                    MessageBox.success("Sequence of chained actions for the proposed tasks got created successfully, do update the system/destination information to make it operational");
                    that.oDialog.setBusy(false);
                    oUploadDialog && oUploadDialog.close();
                }).catch(function(error){
                    let oErrors = new JSONModel({value:[], error_visible: true, error_message:error.message});
                    console.log(oErrors);
                    oUploadDialog && oUploadDialog.close();
                })
                
            },
            onClose: function(oEvent) {
                oUploadDialog && oUploadDialog.close();
            },
            onAfterClose: function (oEvent) {
                oExtensionAPI.removeDependent(oUploadDialog);
                oUploadDialog.destroy();
                oUploadDialog = undefined;
            }
        };
    }
    return {
        dialogUploadFilesList:'',
        onUploadCancel: function(oEvent){
            console.log(oEvent);
            console.log(this.dialogUploadFilesList);
        },
        showLLMSuggestionsDialog: function(oEvent) {
            console.log(oEvent);
            console.log(this);
            var oDependents = this._view.getDependents(), bDialogOpened=false;
            for (let index = 0; index < oDependents.length; index++) {
                if(oDependents[index].getId().includes('idLLMActionsDialog')==true){
                    bDialogOpened = true;
                    oDependents[index].open();
                }
            }
            if(bDialogOpened==false){
                this.loadFragment({
                    id: "idLLMActionsDialog",
                    name: "sap.paa.action.mgmt.ui.actions.custom.LLMActionsExtView",
                    controller: _createUploadController(this)
                }).then(function (oDialog) {
                    //oDialog1 = oDialog[0];
                    oDialog.open();
                });
            }
        }
    };
});
