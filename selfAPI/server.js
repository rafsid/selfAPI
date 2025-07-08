const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Store this in your .env file

// Middleware to log incoming requests
app.use((req, res, next) => {
  console.log(
    "Incoming Request:",
    JSON.stringify(
      {
        method: req.method,
        path: req.path,
        body: req.body,
        headers: req.headers,
      },
      null,
      2
    )
  );
  next();
});

// Middleware to log outgoing responses
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    console.log(
      "Outgoing Response:",
      JSON.stringify(
        {
          statusCode: res.statusCode,
          body: body,
        },
        null,
        2
      )
    );
    originalJson.call(this, body);
  };
  next();
});

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { model, messages } = req.body;

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
        },
        null,
        2
      )
    );

    const response = await axios.post(
      OPENAI_API_URL,
      { model, messages },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    // Ensure the response is in JSON format
    const jsonResponse = response.data;
    console.log("Response from OpenAI:", JSON.stringify(jsonResponse, null, 2));

    res.json(jsonResponse);
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
