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
  console.log("Incoming Request:", {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers,
  });
  next();
});

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { model, messages } = req.body;

    if (!model || !messages) {
      console.log("Bad Request:", { error: "Model and messages are required" });
      return res.status(400).json({ error: "Model and messages are required" });
    }

    console.log("Outgoing Request to OpenAI:", {
      url: OPENAI_API_URL,
      model,
      messages,
    });

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

    console.log("Response from OpenAI:", response.data);

    res.json(response.data);
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: error.message });
  }
});

// Middleware to log outgoing responses
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    console.log("Outgoing Response:", {
      statusCode: res.statusCode,
      body: body,
    });
    originalJson.call(this, body);
  };
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
