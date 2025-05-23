import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 Testing Notion MCP Server...\n');

const serverProcess = spawn('node', [path.join(__dirname, '..', 'dist', 'index.js')], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NOTION_API_KEY: 'test_key_for_validation'
  }
});

const timeout = setTimeout(() => {
  console.log('❌ Server failed to start within 5 seconds');
  serverProcess.kill();
  process.exit(1);
}, 5000);

serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('Server output:', output);
  
  if (output.includes('Notion MCP Server running on stdio')) {
    clearTimeout(timeout);
    console.log('✅ Server started successfully!\n');
    console.log('📤 Sending test request for tools list...\n');
    
    const testRequest = {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 1
    };
    
    serverProcess.stdin.write(JSON.stringify(testRequest) + '\n');
  }
});

serverProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    if (response.result && response.result.tools) {
      console.log(`✅ Server responded with ${response.result.tools.length} tools:\n`);
      
      // Group tools by category
      const pageTools = response.result.tools.filter(t => t.name.includes('page'));
      const dbTools = response.result.tools.filter(t => t.name.includes('database'));
      const blockTools = response.result.tools.filter(t => t.name.includes('block'));
      const searchTools = response.result.tools.filter(t => t.name.includes('search'));
      
      console.log(`📄 Page Tools (${pageTools.length}):`);
      pageTools.forEach(tool => console.log(`   • ${tool.name} - ${tool.description}`));
      
      console.log(`\n🗄️  Database Tools (${dbTools.length}):`);
      dbTools.forEach(tool => console.log(`   • ${tool.name} - ${tool.description}`));
      
      console.log(`\n🧱 Block Tools (${blockTools.length}):`);
      blockTools.forEach(tool => console.log(`   • ${tool.name} - ${tool.description}`));
      
      console.log(`\n🔍 Search Tools (${searchTools.length}):`);
      searchTools.forEach(tool => console.log(`   • ${tool.name} - ${tool.description}`));
      
      console.log('\n🎉 All tests passed! The server is working correctly.\n');
      console.log('⚠️  Note: To use with real Notion API, set NOTION_API_KEY environment variable.');
      serverProcess.kill();
      process.exit(0);
    }
  } catch (e) {
    // Not JSON, ignore
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});