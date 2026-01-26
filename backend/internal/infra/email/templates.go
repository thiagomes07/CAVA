package email

import (
	"bytes"
	"html/template"
)

// =============================================
// TEMPLATES DE EMAIL
// =============================================

// WelcomeEmailData contém os dados para o email de boas-vindas
type WelcomeEmailData struct {
	UserName    string
	CompanyName string
	LoginURL    string
}

// PasswordResetData contém os dados para o email de recuperação de senha
type PasswordResetData struct {
	UserName  string
	ResetURL  string
	ExpiresIn string // ex: "24 horas"
}

// NotificationData contém os dados para notificações genéricas
type NotificationData struct {
	UserName    string
	Title       string
	Message     string
	ActionURL   string
	ActionLabel string
}

// Templates HTML para emails
const (
	// Template base que envolve todos os emails
	baseTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Title}}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        h1 {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 20px;
        }
        p {
            margin-bottom: 16px;
        }
        .highlight {
            background-color: #f0f9ff;
            padding: 16px;
            border-radius: 6px;
            border-left: 4px solid #2563eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">CAVA</div>
        </div>
        <div class="content">
            {{.Content}}
        </div>
        <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema CAVA.</p>
            <p>Se você não solicitou esta mensagem, por favor ignore este email.</p>
        </div>
    </div>
</body>
</html>
`

	welcomeContent = `
<h1>Bem-vindo ao CAVA, {{.UserName}}! 🎉</h1>
<p>Sua conta foi criada com sucesso na plataforma {{.CompanyName}}.</p>
<p>Você já pode acessar o sistema e começar a utilizar todas as funcionalidades disponíveis.</p>
<div style="text-align: center; margin: 30px 0;">
    <a href="{{.LoginURL}}" class="button">Acessar Minha Conta</a>
</div>
<p>Se você tiver qualquer dúvida, não hesite em entrar em contato com nossa equipe de suporte.</p>
`

	passwordResetContent = `
<h1>Redefinição de Senha</h1>
<p>Olá, {{.UserName}}!</p>
<p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
<div class="highlight">
    <strong>⚠️ Importante:</strong> Este link é válido por {{.ExpiresIn}}.
</div>
<div style="text-align: center; margin: 30px 0;">
    <a href="{{.ResetURL}}" class="button">Redefinir Minha Senha</a>
</div>
<p>Se você não solicitou essa alteração, por favor ignore este email. Sua senha permanecerá a mesma.</p>
`

	notificationContent = `
<h1>{{.Title}}</h1>
<p>Olá, {{.UserName}}!</p>
<p>{{.Message}}</p>
{{if .ActionURL}}
<div style="text-align: center; margin: 30px 0;">
    <a href="{{.ActionURL}}" class="button">{{.ActionLabel}}</a>
</div>
{{end}}
`
)

// RenderWelcomeEmail gera o HTML do email de boas-vindas
func RenderWelcomeEmail(data WelcomeEmailData) (html string, text string, err error) {
	html, err = renderTemplate("welcome", welcomeContent, data)
	if err != nil {
		return "", "", err
	}

	text = renderWelcomeText(data)
	return html, text, nil
}

// RenderPasswordResetEmail gera o HTML do email de recuperação de senha
func RenderPasswordResetEmail(data PasswordResetData) (html string, text string, err error) {
	html, err = renderTemplate("password_reset", passwordResetContent, data)
	if err != nil {
		return "", "", err
	}

	text = renderPasswordResetText(data)
	return html, text, nil
}

// RenderNotificationEmail gera o HTML de notificação genérica
func RenderNotificationEmail(data NotificationData) (html string, text string, err error) {
	html, err = renderTemplate("notification", notificationContent, data)
	if err != nil {
		return "", "", err
	}

	text = renderNotificationText(data)
	return html, text, nil
}

// renderTemplate renderiza um template com o conteúdo específico
func renderTemplate(name string, content string, data interface{}) (string, error) {
	// Criar struct para o template base
	type baseData struct {
		Title   string
		Content template.HTML
	}

	// Renderizar o conteúdo específico primeiro
	contentTmpl, err := template.New(name + "_content").Parse(content)
	if err != nil {
		return "", err
	}

	var contentBuf bytes.Buffer
	if err := contentTmpl.Execute(&contentBuf, data); err != nil {
		return "", err
	}

	// Renderizar o template base com o conteúdo
	baseTmpl, err := template.New(name + "_base").Parse(baseTemplate)
	if err != nil {
		return "", err
	}

	var baseBuf bytes.Buffer
	if err := baseTmpl.Execute(&baseBuf, baseData{
		Title:   name,
		Content: template.HTML(contentBuf.String()),
	}); err != nil {
		return "", err
	}

	return baseBuf.String(), nil
}

// Versões em texto plano dos emails (para clientes que não suportam HTML)

func renderWelcomeText(data WelcomeEmailData) string {
	return `Bem-vindo ao CAVA, ` + data.UserName + `!

Sua conta foi criada com sucesso na plataforma ` + data.CompanyName + `.

Você já pode acessar o sistema e começar a utilizar todas as funcionalidades disponíveis.

Acesse sua conta: ` + data.LoginURL + `

Se você tiver qualquer dúvida, não hesite em entrar em contato com nossa equipe de suporte.

---
Este email foi enviado automaticamente pelo sistema CAVA.
`
}

func renderPasswordResetText(data PasswordResetData) string {
	return `Redefinição de Senha

Olá, ` + data.UserName + `!

Recebemos uma solicitação para redefinir a senha da sua conta.

IMPORTANTE: Este link é válido por ` + data.ExpiresIn + `.

Clique no link abaixo para redefinir sua senha:
` + data.ResetURL + `

Se você não solicitou essa alteração, por favor ignore este email. Sua senha permanecerá a mesma.

---
Este email foi enviado automaticamente pelo sistema CAVA.
`
}

func renderNotificationText(data NotificationData) string {
	text := data.Title + `

Olá, ` + data.UserName + `!

` + data.Message

	if data.ActionURL != "" {
		text += `

` + data.ActionLabel + `: ` + data.ActionURL
	}

	text += `

---
Este email foi enviado automaticamente pelo sistema CAVA.
`
	return text
}
