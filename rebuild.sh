#!/bin/bash

# Cores para o output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Iniciando Recompilação do DeepSeek CLI...${NC}"

# 1. Limpar build anterior
echo -e "${YELLOW}🧹 Limpando diretório dist/...${NC}"
rm -rf dist/

# 2. Instalar dependências (caso algo tenha mudado)
echo -e "${YELLOW}📦 Verificando dependências...${NC}"
npm install

# 3. Compilar TypeScript
echo -e "${YELLOW}🏗️  Compilando TypeScript...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Compilação bem-sucedida!${NC}"
else
    echo -e "❌ Erro na compilação. Abortando."
    exit 1
fi

# 4. Instalar Globalmente
echo -e "${YELLOW}📥 Reinstalando binário globalmente...${NC}"

# Desinstala forçado primeiro para garantir limpeza
npm uninstall -g run-deepseek-cli > /dev/null 2>&1

# Instala novamente
npm install -g .

# 5. Garantir permissão de execução (correção robusta)
# Descobre onde o npm instala os binários globais
NPM_GLOBAL_BIN="$(npm prefix -g)/bin"
BINARY_PATH="$NPM_GLOBAL_BIN/deepseek"

echo -e "${YELLOW}🔑 Ajustando permissões em $BINARY_PATH...${NC}"

if [ -f "$BINARY_PATH" ]; then
    chmod +x "$BINARY_PATH"
    echo -e "${GREEN}✅ Permissões ajustadas com sucesso.${NC}"
else
    echo -e "${YELLOW}⚠️  Aviso: Não encontrei o binário em $BINARY_PATH.${NC}"
    echo -e "Tentando via 'which'..."
    chmod +x "$(which deepseek)" 2>/dev/null
fi

# 6. Limpar hash do shell
hash -r

echo -e "${GREEN}🚀 DeepSeek CLI atualizado e pronto para uso!${NC}"
echo -e "Teste com: ${BLUE}deepseek${NC}"
