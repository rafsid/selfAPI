const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { model, messages, stream } = req.body;

    if (!model || !messages) {
      console.log(
        "Bad Request:",
        JSON.stringify({ error: "Model and messages are required" }, null, 2)
      );
      return res.status(400).json({ error: "Model and messages are required" });
    }

    console.log(
      "Outgoing Request to OpenAI:",
      JSON.stringify(
        {
          url: OPENAI_API_URL,
          model,
          messages,
          stream,
        },
        null,
        2
      )
    );

    const response = await axios.post(
      OPENAI_API_URL,
      { model, messages, stream },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    console.log(
      "Response from OpenAI:",
      JSON.stringify(response.data, null, 2)
    );

    // Format the response to match OpenAI's API structure
    const formattedResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: response.data.choices[0].message.content,
          },
          finish_reason: "stop",
        },
      ],
      usage: response.data.usage,
    };

    res.json(formattedResponse);
  } catch (error) {
    console.error(
      "Error:",
      JSON.stringify(
        error.response ? error.response.data : error.message,
        null,
        2
      )
    );
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
