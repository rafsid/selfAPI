# cURL to OpenRouter Server Converter

## Overview
A Python utility that converts cURL commands into a Node.js server implementation compatible with OpenRouter API. The generated server code provides an OpenAI-compatible endpoint that proxies requests to OpenRouter's API.

## Features
- Converts cURL commands to fully functional Node.js server code
- Parses and preserves headers and authentication details
- Supports streaming responses
- Handles error cases gracefully
- Interactive command-line interface

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/selfAPI.git
cd selfAPI
```

2. Install Python dependencies:
```bash
pip install readchar
```

3. For the generated server, install Node.js dependencies:
```bash
npm install express body-parser axios
```

## Usage

1. Run the converter script:
```bash
python sergen.py
```

2. When prompted, paste your cURL command. Example format:
```bash
curl 'https://openrouter.ai/api/v1/chat/completions' \
  -H 'Authorization: Bearer your_token_here' \
  -H 'Content-Type: application/json'
```

3. Enter the desired output filename (e.g., `server.js`)

4. The script will generate a Node.js server file with:
- Express server setup
- Request handling
- Error management
- Streaming support
- OpenRouter API integration

## Generated Server Features

- OpenAI-compatible `/v1/chat/completions` endpoint
- Support for streaming responses
- Comprehensive error handling
- Request validation
- Detailed logging

## Configuration

The generated server includes:
- Port configuration (default: 3000)
- Headers from original cURL command
- Error logging system
- Response formatting

## Example Usage of Generated Server

1. Start the server:
```bash
node server.js
```

2. Make requests to the local endpoint:
```bash
curl http://localhost:3000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "deepseek_code",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

## Error Handling

The generated server includes robust error handling:
- API communication errors
- Request validation
- Response parsing
- Stream processing
- Detailed error logging

## Security Notes

- Review and sanitize headers before deployment
- Secure API keys and sensitive information
- Consider adding rate limiting
- Implement proper authentication

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- OpenRouter API team for the API service
- Express.js team for the web framework
- Axios team for the HTTP client
