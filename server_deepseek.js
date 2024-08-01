const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
app.use(bodyParser.json());

const llm_API_URL = "https://chat.deepseek.com/api/v0/chat/completions";
const llm_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "x-app-version": "20240126.0",
  "authorization": "Bearer 08b5d9fc777c4ff8a4025a9d523aba5b",
  "content-type": "application/json",
  "Origin": "https://chat.deepseek.com",
  "Connection": "keep-alive",
  "Referer": "https://chat.deepseek.com/coder",
  "Cookie": "intercom-device-id-guh50jw4=17378f08-de75-4cad-a0ed-46635e6aca10; intercom-session-guh50jw4=UmF3NUdMb3E1SUhTSmVBUW5UUmlwL0ppWnJ0aVdpSDQ3bk00U2FHdUwwbzltaThEV3lvM3lWY0FVRkhXSXBLSy0tK3B2bVpmMHZHRjdwcEE1ZVNzVWpKQT09--e218e56790e8444b30b8384ecf0d7855e7532969",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Priority": "u=0",
  "Pragma": "no-cache",
  "Cache-Control": "no-cache",
  "TE": "trailers"
};

async function getllmResponse(messages) {
  // Concatenate all message contents into a single string
  const concatenatedMessages = messages.map(msg => msg.content).join(' ');

  const llmData = {
    model: "deepseek_code",
    message: concatenatedMessages,  // Use the concatenated string
    stream: true,
    max_tokens: 1000000,
    temperature: 0.7,
  };

  try {
    console.log("Sending request to llm API:", JSON.stringify(llmData, null, 2));
    const response = await axios.post(llm_API_URL, llmData, {
      headers: llm_HEADERS,
    });
    console.log("Received response from llm API:", JSON.stringify(response.data, null, 2));

    let completeResponse = "";
    if (typeof response.data === "string") {
      // Handle streaming-style response
      response.data.split("\n").forEach((line) => {
        if (line.startsWith("data: ")) {
          try {
            const parsedData = JSON.parse(line.slice(6));
            if (parsedData.choices && parsedData.choices[0].delta.content) {
              completeResponse += parsedData.choices[0].delta.content;
            }
          } catch (e) {
            console.error("Error parsing line:", line, e);
          }
        }
      });
    } else if (response.data.choices && response.data.choices[0].message) {
      // Handle JSON response
      completeResponse = response.data.choices[0].message.content;
    } else {
      throw new Error("Unexpected response format from llm API");
    }

    // Remove any surrounding quotes from the response
    completeResponse = completeResponse.replace(/^["'](.*)["']$/, "$1");

    return {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "llm-2", // Use a consistent model name
      choices: [
        {
          message: {
            role: "assistant",
            content: completeResponse.trim(),
          },
        },
      ],
    };
  } catch (error) {
    logError(error);
    throw error;
  }
}

app.post("/v1/chat/completions", async (req, res) => {
  const { messages, model, stream, max_tokens, temperature } = req.body;

  try {
    const llmResponse = await getllmResponse(messages);

    if (stream) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const words = llmResponse.choices[0].message.content.split(" ");
      for (let i = 0; i < words.length; i++) {
        const chunk = {
          id: llmResponse.id,
          object: "chat.completion.chunk",
          created: llmResponse.created,
          model: llmResponse.model,
          choices: [{ delta: { content: words[i] + " " } }],
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms delay between chunks
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      res.json(llmResponse);
    }
  } catch (error) {
    console.error("Error processing request:", error);

    // Create a safe error response
    const safeErrorResponse = {
      error: {
        message: "An error occurred while processing your request.",
        type: error.name,
        param: null,
        code: null,
      },
    };

    // If it's an AxiosError, we can provide more details
    if (error.isAxiosError) {
      safeErrorResponse.error.message = error.message;
      safeErrorResponse.error.code = error.code;
      if (error.response) {
        safeErrorResponse.error.status = error.response.status;
        safeErrorResponse.error.data = error.response.data;
      }
    }

    res.status(500).json(safeErrorResponse);
  }
});

const PORT = 3000;
try {
  app.listen(PORT, () => {
    console.log(
      `OpenRouter-integrated OpenAI-compatible API server is running on port ${PORT}`
    );
  });
} catch (error) {
  console.error(`Failed to start server: ${error.message}`);
}

function logError(error) {
  console.error("Error details:");
  console.error("  Message:", error.message);
  console.error("  Name:", error.name);
  if (error.stack) {
    console.error("  Stack:", error.stack);
  }
  if (error.response) {
    console.error("  Response data:", error.response.data);
    console.error("  Response status:", error.response.status);
    console.error("  Response headers:", error.response.headers);
  }
}
