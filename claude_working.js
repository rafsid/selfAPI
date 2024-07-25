const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
app.use(bodyParser.json());

const cookie_data =
  "user-sidebar-pinned=false; CH-prefers-color-scheme=light; __ssid=3868fed1dda0c08206e9c7c253cc004; lastActiveOrg=27e9fb8a-2219-4695-8f26-dae6f42e8a10; intercom-device-id-lupk8zyo=80f39008-c667-4457-a107-fd0b4a28ed25; _gcl_au=1.1.472404005.1717512582; _fbp=fb.1.1717512584378.22452886242096336; _rdt_uuid=1717512583192.dce91c0a-e381-4f09-81dd-1c02861d5d56; __stripe_mid=3e34a1e5-6ea2-496f-82d4-0dddaca470d2ff2d6b; sessionKey=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; intercom-session-lupk8zyo=R0ZSayt3T2VPVTZlaGE5aFlyOWxIMnlzSnhrVzlIWEhOWVE5Qzcxb0RVTUc5ZnFkMTVDQmJsUk9GeURlSTI4Si0tMzl3cmpMQzQ0RWdxTG1uaU1QVTM5UT09--36aa55e9f59a1c804b59b1d35c3eef7500f1ddca; activitySessionId=3e7f65ae-2afc-4493-86ee-d3058c00a372; __cf_bm=H13Yda1jS9TXYHtkT6.rSkfBUb.XGuOClGl8OZYZ77M-1721816118-1.0.1.1-IyqX7CbCOYaA5JC3dyZgev7F98tsSKK7RxuJwnvqqek8zVYUgyztZ8Qr7sblYmgvDnmtDsFJzMSX9c28fiRyeg; cf_clearance=0GJk8aftxy8VaXRhVJyzVwab8pASCOdhm1yWWO8OEsE-1721816119-1.0.1.1-xm_H3DZgJNRkJY7vlMH7uWbinODtHBtBc.ITPk3YzEAHWTvL_sVgwWggOTeJ8_ETjOi0MaQx7CJ3l_acQ5..1g";

const CLAUDE_API_URL =
  "https://claude.ai/api/organizations/27e9fb8a-2219-4695-8f26-dae6f42e8a10/chat_conversations/05d3e4ba-2465-4f99-b4a6-bb23b6359110/completion";
const CLAUDE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0",
  Accept: "text/event-stream, text/event-stream",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Content-Type": "application/json",
  Referer: "https://claude.ai/chat/05d3e4ba-2465-4f99-b4a6-bb23b6359110",
  Origin: "https://claude.ai",
  Cookie: cookie_data, // Replace with actual cookie data
};

async function getClaudeResponse(messages) {
  const prompt =
    messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n") +
    "\nAssistant:";
  const claudeData = {
    prompt,
    parent_message_uuid: "659c9b54-8134-4659-abee-d168d97fd7cd",
    timezone: "Asia/Kolkata",
    attachments: [],
    files: [],
    rendering_mode: "raw",
  };

  try {
    const response = await axios.post(CLAUDE_API_URL, claudeData, {
      headers: CLAUDE_HEADERS,
    });
    let completeResponse = "";
    response.data.split("\n").forEach((line) => {
      if (line.startsWith("data: ")) {
        try {
          const parsedData = JSON.parse(line.slice(6));
          if (parsedData.type === "completion") {
            completeResponse += parsedData.completion;
          }
        } catch (e) {
          // Ignore parsing errors for non-JSON lines
        }
      }
    });
    return {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "claude-2",
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
    console.error("Error getting Claude response:", error);
    throw error;
  }
}

app.post("/v1/chat/completions", async (req, res) => {
  const { messages, model, stream, max_tokens, temperature } = req.body;

  try {
    const claudeResponse = await getClaudeResponse(messages);

    if (stream) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const words = claudeResponse.choices[0].message.content.split(" ");
      for (let i = 0; i < words.length; i++) {
        const chunk = {
          id: claudeResponse.id,
          object: "chat.completion.chunk",
          created: claudeResponse.created,
          model: claudeResponse.model,
          choices: [{ delta: { content: words[i] + " " } }],
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      res.json(claudeResponse);
    }
  } catch (error) {
    console.error("Error processing request:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(
    `Claude-integrated OpenAI-compatible API server is running on port ${PORT}`
  );
});
