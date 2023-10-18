const cds = require("@sap/cds");

const LLM_PARAMS = {
    deployment_id: "gpt-4",
    temperature: 0.8,
};

async function callSAPGENAILLMACCESSSERVICE(prompt){
    try {
        const llmAccessService = await cds.connect.to("SAPGENAILLMACCESSSERVICE");
        const payload = {
            ...LLM_PARAMS,
            messages: [
                { role: "system", content: "Assistant is a large language model trained by OpenAI" },
                { role: "user", content: prompt }
            ]
        };
        // @ts-ignore
        const response = await llmAccessService.send({
            // @ts-ignore
            query: "POST /v1/completions",
            data: payload
        });
        return (response["choices"][0].message.content || "").trim(); //replace leading or trailing new lines and whitespaces
    } catch (e) {
        console.error("error is : " + e);
        throw e;
    }
};

async function callLLMService(prompt){
    try {
        const llmAccessService = await cds.connect.to("E2BGENAILLMACCESSSERVICE");
        const payload = {
            "query":prompt
        }
        // @ts-ignore
        const response = await llmAccessService.send({
            // @ts-ignore
            query: "POST /getInfoFromLLM",
            data: payload
        });
        return JSON.parse(response);
    } catch (e) {
        console.error("error is : " + e);
        throw e;
    }
};

function getCSStringFromArray(jsonArray, arrayKey){
    let keyArray = jsonArray.map( function(item){
        return item[arrayKey];
    });
    return keyArray.join(",");
}

module.exports={callSAPGENAILLMACCESSSERVICE, getCSStringFromArray, callLLMService};