// Conexão SSE CORRIGIDA para atualizações em tempo real
function connectToSSE() {
    // Fechar conexão anterior se existir
    if (sseEventSource) {
        if (sseEventSource.abort) {
            sseEventSource.abort();
        }
        sseEventSource = null;
    }
    
    // Verificar se temos token de autenticação
    if (!authToken) {
        console.log('❌ Token não disponível para SSE');
        return;
    }
    
    console.log('🔌 Conectando ao SSE...');
    console.log('🔧 Debug SSE: Token disponível?', !!authToken);
    console.log('🔧 Debug SSE: User conectado?', !!currentUser);
    console.log('🔧 Debug SSE: URL:', `${API_BASE_URL}/luminaires/automation/events`);
    
    // Usar fetch com ReadableStream para suportar headers customizados
    const sseUrl = `${API_BASE_URL}/luminaires/automation/events`;
    const controller = new AbortController();
    sseEventSource = controller; // Armazenar o controller para poder cancelar
    
    fetch(sseUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        },
        signal: controller.signal
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('✅ Conexão SSE estabelecida');
        console.log('🔧 Debug SSE: Response headers:', Object.fromEntries(response.headers.entries()));
        showNotification('🔌 Automação conectada! Estado em tempo real ativo.', 'success');
        updateSSEStatus(true);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Função para processar o stream
        function processStream() {
            return reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('🔚 Stream SSE terminado - tentando reconectar...');
                    // Reconectar após stream terminar
                    setTimeout(() => {
                        if (authToken && currentUser) {
                            console.log('🔄 Reconectando SSE após stream terminar...');
                            connectToSSE();
                        }
                    }, 2000);
                    return;
                }
                
                // Decodificar dados recebidos
                const chunk = decoder.decode(value, { stream: true });
                console.log('📦 Chunk SSE:', chunk);
                
                // Processar cada linha do chunk
                const lines = chunk.split('\n');
                let currentEvent = {};
                
                for (let line of lines) {
                    line = line.trim();
                    
                    if (line.startsWith('event:')) {
                        currentEvent.type = line.substring(6).trim();
                        console.log('🏷️ Event type:', currentEvent.type);
                    } else if (line.startsWith('data:')) {
                        currentEvent.data = line.substring(5).trim();
                        console.log('📋 Event data:', currentEvent.data);
                        
                        // Processar evento quando temos dados
                        if (currentEvent.data) {
                            try {
                                const eventData = JSON.parse(currentEvent.data);
                                console.log('📊 Dados parseados:', eventData);
                                
                                // Processar baseado no tipo ou estrutura
                                if (eventData.allStates) {
                                    console.log('🏠 Estado inicial recebido via SSE');
                                    luminariaStates = eventData.allStates;
                                    updateLuminariaStatesUI();
                                } else if (eventData.luminariaId !== undefined && eventData.isOn !== undefined) {
                                    console.log(`💡 MUDANÇA DE ESTADO VIA SSE: Luminária ${eventData.luminariaId} -> ${eventData.isOn}`);
                                    
                                    // Atualizar estado local
                                    luminariaStates[eventData.luminariaId] = eventData.isOn;
                                    
                                    // Atualizar UI imediatamente
                                    updateLuminariaStateUI(eventData.luminariaId, eventData.isOn);
                                    
                                    showNotification(
                                        `💡 Luminária ${eventData.luminariaId} ${eventData.isOn ? 'ligada' : 'desligada'}`, 
                                        'info'
                                    );
                                }
                            } catch (error) {
                                console.error('❌ Erro parsing SSE:', error);
                            }
                        }
                    } else if (line === '') {
                        // Linha vazia - reset do evento
                        currentEvent = {};
                    }
                }
                
                // Continuar lendo o stream
                return processStream();
            });
        }
        
        // Iniciar processamento do stream
        return processStream();
    })
    .catch(error => {
        if (error.name === 'AbortError') {
            console.log('🔌 Conexão SSE cancelada');
            return;
        }
        
        console.error('❌ Erro na conexão SSE:', error);
        showNotification('Conexão com servidor perdida. Tentando reconectar...', 'warning');
        updateSSEStatus(false);
        
        // Tentar reconectar após 5 segundos
        setTimeout(() => {
            if (authToken && currentUser) {
                console.log('🔄 Tentando reconectar SSE...');
                connectToSSE();
            }
        }, 5000);
    });
}