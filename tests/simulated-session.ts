import { interactiveCommand } from '../src/commands/interactive';
import { DeepSeekAPI, Message } from '../src/api';
import { Config } from '../src/config';

// Mock da configuração
const mockConfig: Config = {
  apiKey: 'test-key',
  model: 'test-model',
  apiUrl: 'http://test',
  useLocal: false,
  ollamaHost: 'http://localhost:11434'
};

// Mock da API para capturar o que é enviado
class MockAPI extends DeepSeekAPI {
  async complete(messages: Message[]): Promise<string> {
    console.log(`\n[TESTE] API recebeu ${messages.length} mensagens de contexto.`);
    
    // Verificar o conteúdo das mensagens
    messages.forEach((msg, idx) => {
        if (msg.role !== 'system') {
            console.log(`  Msg ${idx} (${msg.role}): ${msg.content}`);
        }
    });

    // Responder baseado no input para provar que funciona
    const lastMsg = messages[messages.length - 1];
    return `Simulacao de resposta para: "${lastMsg.content}"`;
  }
  
  async checkOllamaConnection() { return true; }
  async listOllamaModels() { return ['test-model']; }
}

async function runTest() {
  console.log('Iniciando Simulacao de Sessao Interativa...');
  
  const apiMock = new MockAPI(mockConfig);
  
  // Executar o comando sem await para que ele nao bloqueie o envio de inputs
  const sessionPromise = interactiveCommand(mockConfig, apiMock);

  // Simular interacao do usuario
  const inputs = [
    'Ola, meu nome eh Testador',
    'Qual eh o meu nome?',
    'exit'
  ];

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Pequeno delay para garantir que o readline iniciou
  await delay(1000);

  for (const text of inputs) {
    console.log(`\nUsuario digita: "${text}"`);
    // Enviamos o texto + enter
    process.stdin.emit('data', text + '\n');
    
    // Esperamos um pouco para dar tempo da "API" processar
    await delay(1500);
  }

  // Agora esperamos o comando terminar (pois enviamos 'exit')
  await sessionPromise;
  console.log('\nSimulacao concluida com sucesso!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});