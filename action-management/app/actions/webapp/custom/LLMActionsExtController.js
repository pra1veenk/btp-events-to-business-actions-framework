/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
sap.ui.define(["sap/m/MessageBox", "sap/m/MessageToast",  "sap/ui/model/json/JSONModel"], 
function (MessageBox, MessageToast, JSONModel){
    let bFragmentLoaded=false;
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

            onGetActionsFromLLM: function(oEvent) {
                let oVBox = oEvent.getSource().getParent();
                let oTextAreaInput = oVBox.getAggregation("items")[0];
                const userInputForLLM = oTextAreaInput.getValue();
                console.log(userInputForLLM);

                //call llm and get suggested actions
                let oDialog1 = oVBox.getParent();
                let oHBox = oDialog1.getAggregation("content")[1];
                let oOperation = oHBox.getObjectBinding();
                oOperation.setParameter("userInput", userInputForLLM).execute().then(function(event){
                    let oResults = oOperation.getBoundContext().getObject();
                    //let oTopicModel = new JSONModel({value:oResults.value, error_visible:false});
                    //oTable.setModel(oTopicModel, "topicsuggestions");
                    //oTable.setBusyIndicatorDelay(0).setBusy(false);
                    let idTextAreaActions = oHBox.getAggregation("items")[0];
                    idTextAreaActions.setValue(oResults.value);
                    idTextAreaActions.setVisible(true);
                    console.log(oResults);
                }).catch(function(error){
                    let oErrors = new JSONModel({value:[], error_visible: true, error_message:error.message});
                    console.log(oErrors);
                })
                //let suggestedActions = 
            },
            oncreateActions: function(oEvent) {
                let oDialog1 = oEvent.getSource().getParent();
                let oVBox = oDialog1.getAggregation("content")[1];
                let oTextAreaActions = oVBox.getAggregation("items")[0];
                const actionsInput = oTextAreaActions.getValue();
                console.log(actionsInput);

                //call create action and get output
                let oDummyVBox = oDialog1.getAggregation("content")[2];
                let oOperation = oDummyVBox.getObjectBinding();
                oOperation.setParameter("actionsInput", actionsInput).execute().then(function(event){
                    let oResults = oOperation.getBoundContext().getObject();
                    //let oTopicModel = new JSONModel({value:oResults.value, error_visible:false});
                    //oTable.setModel(oTopicModel, "topicsuggestions");
                    //oTable.setBusyIndicatorDelay(0).setBusy(false);
                    console.log(oResults);
                    oExtensionAPI.refresh();
                    MessageBox.success("Chain of actions are created successfully. Please check the actions and update information.");
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
