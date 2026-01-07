package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"
)

func main() {
    log.Println(" CAVA Backend iniciando...")
    
    // TODO: Implementar bootstrap completo
    // 1. Carregar configurações
    // 2. Conectar ao banco
    // 3. Conectar ao storage
    // 4. Inicializar router
    // 5. Registrar middlewares
    // 6. Registrar rotas
    // 7. Iniciar servidor
    
    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    
    log.Println(" CAVA Backend encerrando...")
}
