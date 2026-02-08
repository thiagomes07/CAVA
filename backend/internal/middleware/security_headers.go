package middleware

import "net/http"

// SecurityHeaders adiciona headers de segurança a todas as respostas HTTP.
// Estes headers protegem contra ataques comuns como clickjacking, MIME-sniffing e XSS.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevenir clickjacking: impede que a página seja embutida em iframes
		w.Header().Set("X-Frame-Options", "DENY")

		// Prevenir MIME-sniffing: força o browser a respeitar o Content-Type declarado
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Controlar informações enviadas no header Referer
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Desabilitar funcionalidades do browser que não são necessárias
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		// Prevenir ataques XSS (complementar ao CSP; relevante para browsers antigos)
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// HSTS: forçar HTTPS por 1 ano (incluindo subdomínios)
		// Em produção, o browser lembrará de sempre usar HTTPS
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Content Security Policy: restritiva para API (não serve HTML)
		w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")

		// Cache-Control padrão para respostas de API (não cachear dados sensíveis)
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
		w.Header().Set("Pragma", "no-cache")

		next.ServeHTTP(w, r)
	})
}
