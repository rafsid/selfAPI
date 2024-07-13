const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 3000;
const CLAUDE_API_URL = "https://claude.ai/api/organizations/[org_id]/chat_conversations/[chat_id]/completion";
const CLAUDE_SESSION_KEY = process.env.CLAUDE_SESSION_KEY;

app.post("/v1/messages", async (req, res) => {
  try {
    const { model, messages, max_tokens } = req.body;

    if (!model || !messages) {
      return res.status(400).json({ error: "Model and messages are required" });
    }

    const response = await axios.post(
      CLAUDE_API_URL,
      { model, messages, max_tokens },
      {
        headers: {
          "Content-Type": "application/json",
          "Cookie": `sessionKey=${CLAUDE_SESSION_KEY}`,
          "anthropic-version": "2023-06-01",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
