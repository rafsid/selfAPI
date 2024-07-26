import re
import json
import readchar
import sys

def get_input(prompt):
    print(prompt, end='', flush=True)
    input_chars = []
    while True:
        char = readchar.readchar()
        if char == '\r' or char == '\n':  # Enter key
            print()  # Move to next line
            return ''.join(input_chars)
        elif char == '\x03':  # Ctrl+C
            print()
            sys.exit(0)
        elif char == '\x7f':  # Backspace
            if input_chars:
                input_chars.pop()
                sys.stdout.write('\b \b')  # Erase character on screen
                sys.stdout.flush()
        else:
            input_chars.append(char)
            sys.stdout.write(char)
            sys.stdout.flush()

def parse_curl_command(curl_command):
    url = None
    headers = {}
    cookie = None

    # Extract URL
    url_match = re.search(r"'(https?://[^']+)'", curl_command)
    if url_match:
        url = url_match.group(1)
    else:
        print("Warning: Unable to extract URL from the curl command.")

    # Extract headers
    header_matches = re.findall(r"-H\s+'([^']+)'", curl_command)
    for header in header_matches:
        try:
            key, value = header.split(': ', 1)
            headers[key] = value
            if key.lower() == 'cookie':
                cookie = value
        except ValueError:
            print(f"Warning: Skipping malformed header: {header}")

    return url, headers, cookie

def generate_server_code(url, headers, cookie):
    code = """const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
app.use(bodyParser.json());

const cookie_data = {cookie};

const CLAUDE_API_URL = "{url}";
const CLAUDE_HEADERS = {headers};

async function getClaudeResponse(messages) {{
  const prompt =
    messages.map((msg) => `${{msg.role}}: ${{msg.content}}`).join("\\n") +
    "\\nAssistant:";
  const claudeData = {{
    prompt,
    parent_message_uuid: "659c9b54-8134-4659-abee-d168d97fd7cd",
    timezone: "Asia/Kolkata",
    attachments: [],
    files: [],
    rendering_mode: "raw",
  }};

  try {{
    const response = await axios.post(CLAUDE_API_URL, claudeData, {{
      headers: CLAUDE_HEADERS,
    }});
    let completeResponse = "";
    response.data.split("\\n").forEach((line) => {{
      if (line.startsWith("data: ")) {{
        try {{
          const parsedData = JSON.parse(line.slice(6));
          if (parsedData.type === "completion") {{
            completeResponse += parsedData.completion;
          }}
        }} catch (e) {{
          // Ignore parsing errors for non-JSON lines
        }}
      }}
    }});
    return {{
      id: `chatcmpl-${{Date.now()}}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "claude-2",
      choices: [
        {{
          message: {{
            role: "assistant",
            content: completeResponse.trim(),
          }},
        }},
      ],
    }};
  }} catch (error) {{
    console.error("Error getting Claude response:", error);
    throw error;
  }}
}}

app.post("/v1/chat/completions", async (req, res) => {{
  const {{ messages, model, stream, max_tokens, temperature }} = req.body;

  try {{
    const claudeResponse = await getClaudeResponse(messages);

    if (stream) {{
      res.writeHead(200, {{
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      }});

      const words = claudeResponse.choices[0].message.content.split(" ");
      for (let i = 0; i < words.length; i++) {{
        const chunk = {{
          id: claudeResponse.id,
          object: "chat.completion.chunk",
          created: claudeResponse.created,
          model: claudeResponse.model,
          choices: [{{ delta: {{ content: words[i] + " " }} }}],
        }};
        res.write(`data: ${{JSON.stringify(chunk)}}\\n\\n`);
        await new Promise((resolve) => setTimeout(resolve, 0.01)); // Simulate delay
      }}
      res.write("data: [DONE]\\n\\n");
      res.end();
    }} else {{
      res.json(claudeResponse);
    }}
  }} catch (error) {{
    console.error("Error processing request:", error);
    res
      .status(500)
      .json({{ error: "An error occurred while processing your request." }});
  }}
}});

const PORT = 3000;
app.listen(PORT, () => {{
  console.log(
    `Claude-integrated OpenAI-compatible API server is running on port ${{PORT}}`
  );
}});
"""
    formatted_headers = json.dumps(headers, indent=2)
    return code.format(url=url, headers=formatted_headers, cookie=json.dumps(cookie))

def main():
    # Ask the user for the curl command
    curl_command = get_input("Please enter the curl command: ")

    # Ask the user for the output file name
    output_file = get_input("Please enter the name of the output file (including .js extension): ")

    url, headers, cookie = parse_curl_command(curl_command)

    if not url or not headers:
        print("Failed to parse the curl command. Please check the format.")
        return

    server_code = generate_server_code(url, headers, cookie)

    # Save the generated code to the specified file
    with open(output_file, 'w') as f:
        f.write(server_code)

    print(f"Server code has been generated and saved to {output_file}")
    print("Note: Please review the generated code and ensure all necessary information is included.")

if __name__ == "__main__":
    main()
