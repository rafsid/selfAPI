const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
    methods: ["POST"],
  })
);

app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Check for API key
if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in the environment variables");
  process.exit(1);
}

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

// List of valid OpenAI models
const validModels = ["gpt-4","gpt-4o-2024-05-13", "gpt-3.5-turbo", "gpt-3.5-turbo-16k"];

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { model, messages } = req.body;

    // Validate model
    if (!model || !validModels.includes(model)) {
      return res
        .status(400)
        .json({
          error: `Invalid model. Must be one of: ${validModels.join(", ")}`,
        });
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid 'messages'. Must be a non-empty array." });
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY.trim()}`,
    };

    console.log(
      "Outgoing Request to OpenAI:",
      JSON.stringify(
        {
          url: OPENAI_API_URL,
          headers: {
            ...headers,
            Authorization: "Bearer [REDACTED]", // Redact the actual API key in logs
          },
          body: { model, messages },
        },
        null,
        2
      )
    );

    const response = await axios.post(
      OPENAI_API_URL,
      { model, messages },
      { headers }
    );

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

    if (error.response) {
      res
        .status(error.response.status)
        .json({ error: error.response.data.error || error.message });
    } else if (error.code === "ECONNREFUSED") {
      res
        .status(503)
        .json({
          error: "Unable to connect to OpenAI API. Please try again later.",
        });
    } else {
      res
        .status(500)
        .json({
          error: "An unexpected error occurred",
          details: error.message,
        });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
