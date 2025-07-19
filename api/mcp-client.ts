import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

class VercelMCPClient {
  private client: Client

  constructor() {
    this.client = new Client(
      {
        name: "vercel-mcp-client",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )
  }

  async connect() {
    const transport = new StdioClientTransport()
    await this.client.connect(transport)
  }

  async listTools() {
    const response = await this.client.listTools({})
    return response.tools
  }

  async callTool(name: string, args: any) {
    const response = await this.client.callTool({
      name,
      arguments: args
    })
    return response.content
  }

  async disconnect() {
    await this.client.close()
  }
}

// Vercel Functions için export
export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    const { action, toolName, args } = req.body
    
    const client = new VercelMCPClient()
    
    try {
      await client.connect()
      
      switch (action) {
        case 'list_tools':
          const tools = await client.listTools()
          res.status(200).json({ success: true, tools })
          break
          
        case 'call_tool':
          if (!toolName) {
            res.status(400).json({ error: 'Tool name required' })
            return
          }
          const result = await client.callTool(toolName, args || {})
          res.status(200).json({ success: true, result })
          break
          
        default:
          res.status(400).json({ error: 'Invalid action' })
      }
      
      await client.disconnect()
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
} 