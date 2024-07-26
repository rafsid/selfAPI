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
    # Ensure the URL is correct
    if not url.endswith("/chat/completions"):
        url = "https://openrouter.ai/api/v1/chat/completions"

    # Ensure content-type is application/json
    headers["content-type"] = "application/json"

    # Remove any partial header values from the URL
    url = url.split(",")[0]

    code = """const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
app.use(bodyParser.json());

const CLAUDE_API_URL = "{url}";
const CLAUDE_HEADERS = {headers};

async function getClaudeResponse(messages) {{
  const claudeData = {{
    model: "deepseek/deepseek-coder",
    messages: messages,
    stream: false,
    max_tokens: 1000000,
    temperature: 0.7,
  }};

  try {{
    console.log(
      "Sending request to Claude API:",
      JSON.stringify(claudeData, null, 2)
    );
    const response = await axios.post(CLAUDE_API_URL, claudeData, {{
      headers: CLAUDE_HEADERS,
    }});
    console.log(
      "Received response from Claude API:",
      JSON.stringify(response.data, null, 2)
    );

    let completeResponse = "";
    if (typeof response.data === "string") {{
      // Handle streaming-style response
      response.data.split("\\n").forEach((line) => {{
        if (line.startsWith("data: ")) {{
          try {{
            const parsedData = JSON.parse(line.slice(6));
            if (parsedData.choices && parsedData.choices[0].delta.content) {{
              completeResponse += parsedData.choices[0].delta.content;
            }}
          }} catch (e) {{
            console.error("Error parsing line:", line, e);
          }}
        }}
      }});
    }} else if (response.data.choices && response.data.choices[0].message) {{
      // Handle JSON response
      completeResponse = response.data.choices[0].message.content;
    }} else {{
      throw new Error("Unexpected response format from Claude API");
    }}

    // Remove any surrounding quotes from the response
    completeResponse = completeResponse.replace(/^["'](.*)["']$/, "$1");

    return {{
      id: `chatcmpl-${{Date.now()}}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "claude-2", // Use a consistent model name
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
    logError(error);
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
        await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms delay between chunks
      }}
      res.write("data: [DONE]\\n\\n");
      res.end();
    }} else {{
      res.json(claudeResponse);
    }}
  }} catch (error) {{
    console.error("Error processing request:", error);

    // Create a safe error response
    const safeErrorResponse = {{
      error: {{
        message: "An error occurred while processing your request.",
        type: error.name,
        param: null,
        code: null,
      }},
    }};

    // If it's an AxiosError, we can provide more details
    if (error.isAxiosError) {{
      safeErrorResponse.error.message = error.message;
      safeErrorResponse.error.code = error.code;
      if (error.response) {{
        safeErrorResponse.error.status = error.response.status;
        safeErrorResponse.error.data = error.response.data;
      }}
    }}

    res.status(500).json(safeErrorResponse);
  }}
}});

const PORT = 3000;
try {{
  app.listen(PORT, () => {{
    console.log(
      `OpenRouter-integrated OpenAI-compatible API server is running on port ${{PORT}}`
    );
  }});
}} catch (error) {{
  console.error(`Failed to start server: ${{error.message}}`);
}}

function logError(error) {{
  console.error("Error details:");
  console.error("  Message:", error.message);
  console.error("  Name:", error.name);
  if (error.stack) {{
    console.error("  Stack:", error.stack);
  }}
  if (error.response) {{
    console.error("  Response data:", error.response.data);
    console.error("  Response status:", error.response.status);
    console.error("  Response headers:", error.response.headers);
  }}
}}
"""
    formatted_headers = json.dumps(headers, indent=2)
    return code.format(url=url, headers=formatted_headers)

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
    print("Make sure to install the required Node.js packages (express, body-parser, axios) before running the server.")

if __name__ == "__main__":
    main()
