package email

import (
	"bytes"
	"html/template"
)

// =============================================
// TEMPLATES DE EMAIL - CAVA STONE PLATFORM
// Design System: Premium, Elegante, Minimalista
// Paleta: Obsidian (#121212), Porcelain (#FFFFFF), Mineral (#F9F9FB)
// =============================================

// WelcomeEmailData contém os dados para o email de boas-vindas
type WelcomeEmailData struct {
	UserName    string
	CompanyName string
	LoginURL    string
	Email       string // email do usuário para exibir
	Password    string // senha temporária (se aplicável)
}

// PasswordResetData contém os dados para o email de recuperação de senha
type PasswordResetData struct {
	UserName  string
	Code      string // código de 6 dígitos
	ResetURL  string
	ExpiresIn string // ex: "15 minutos"
}

// NotificationData contém os dados para notificações genéricas
type NotificationData struct {
	UserName    string
	Title       string
	Message     string
	ActionURL   string
	ActionLabel string
}

// InviteEmailData contém os dados para o email de convite de usuário
type InviteEmailData struct {
	UserName          string
	RoleDescription   string // ex: "vendedor interno", "administrador", "vendedor parceiro"
	Email             string
	TemporaryPassword string
	LoginURL          string
}

// OfferLink representa um link de oferta para o email
type OfferLink struct {
	Title       string
	Description string
	Price       string // Já formatado: "R$ 1.500,00"
	URL         string
	ImageURL    string // URL da imagem de preview do lote/produto
}

// OffersEmailData contém os dados para o email de ofertas para clientes
type OffersEmailData struct {
	ClienteName   string
	CustomMessage string
	Links         []OfferLink
}

// Templates HTML para emails - Design System CAVA Premium
const (
	// Template base premium que envolve todos os emails
	baseTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{.Title}}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        
        /* Base Styles - CAVA Design System */
        body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #F9F9FB;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #121212;
        }
        
        .email-wrapper {
            width: 100%;
            background-color: #F9F9FB;
            padding: 40px 20px;
        }
        
        .email-container {
            max-width: 560px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }
        
        /* Header */
        .email-header {
            background-color: #121212;
            padding: 32px 40px;
            text-align: center;
        }
        
        .logo {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 0.2em;
            color: #FFFFFF;
            text-decoration: none;
        }
        
        .logo-tagline {
            font-size: 11px;
            letter-spacing: 0.15em;
            color: rgba(255, 255, 255, 0.6);
            margin-top: 8px;
            text-transform: uppercase;
        }
        
        /* Content */
        .email-content {
            padding: 40px;
        }
        
        h1 {
            font-size: 24px;
            font-weight: 600;
            color: #121212;
            margin: 0 0 16px 0;
            line-height: 1.3;
        }
        
        p {
            font-size: 15px;
            color: #4A4A4A;
            margin: 0 0 16px 0;
            line-height: 1.7;
        }
        
        /* Primary Button */
        .btn-primary {
            display: inline-block;
            padding: 14px 32px;
            background-color: #121212;
            color: #FFFFFF !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            letter-spacing: 0.02em;
            transition: background-color 0.2s ease;
        }
        
        .btn-primary:hover {
            background-color: #0F0F0F;
        }
        
        /* Code/Credential Box */
        .credential-box {
            background: linear-gradient(135deg, #F9F9FB 0%, #F3F3F3 100%);
            border: 1px solid #E5E5E5;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
        }
        
        .credential-label {
            font-size: 12px;
            color: #888888;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 8px;
        }
        
        .credential-value {
            font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 0.15em;
            color: #121212;
            padding: 12px 20px;
            background-color: #FFFFFF;
            border-radius: 8px;
            display: inline-block;
            border: 2px dashed #121212;
            margin: 8px 0;
        }
        
        .credential-hint {
            font-size: 12px;
            color: #888888;
            margin-top: 12px;
        }
        
        /* Credentials List (for welcome email) */
        .credentials-list {
            background-color: #F9F9FB;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
        }
        
        .credential-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #E5E5E5;
        }
        
        .credential-row:last-child {
            border-bottom: none;
        }
        
        .credential-row-label {
            font-size: 13px;
            color: #888888;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .credential-row-value {
            font-family: 'JetBrains Mono', 'SF Mono', monospace;
            font-size: 14px;
            font-weight: 600;
            color: #121212;
            background-color: #FFFFFF;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #E5E5E5;
        }
        
        /* Alert Box */
        .alert-box {
            background-color: #FEF3C7;
            border-left: 4px solid #F59E0B;
            border-radius: 0 8px 8px 0;
            padding: 16px 20px;
            margin: 24px 0;
        }
        
        .alert-box p {
            margin: 0;
            font-size: 14px;
            color: #92400E;
        }
        
        .alert-box strong {
            color: #78350F;
        }
        
        /* Info Box */
        .info-box {
            background-color: #EFF6FF;
            border-left: 4px solid #3B82F6;
            border-radius: 0 8px 8px 0;
            padding: 16px 20px;
            margin: 24px 0;
        }
        
        .info-box p {
            margin: 0;
            font-size: 14px;
            color: #1E40AF;
        }
        
        /* Divider */
        .divider {
            height: 1px;
            background-color: #E5E5E5;
            margin: 32px 0;
        }
        
        /* Footer */
        .email-footer {
            background-color: #F9F9FB;
            padding: 24px 40px;
            text-align: center;
            border-top: 1px solid #E5E5E5;
        }
        
        .footer-text {
            font-size: 12px;
            color: #888888;
            margin: 0 0 8px 0;
        }
        
        .footer-brand {
            font-size: 11px;
            letter-spacing: 0.15em;
            color: #AAAAAA;
            text-transform: uppercase;
        }
        
        /* Responsive */
        @media screen and (max-width: 600px) {
            .email-wrapper {
                padding: 20px 10px;
            }
            .email-content, .email-footer {
                padding: 24px 20px;
            }
            .email-header {
                padding: 24px 20px;
            }
            .credential-value {
                font-size: 24px;
                letter-spacing: 0.1em;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="email-header">
                <div class="logo">CAVA</div>
                <div class="logo-tagline">Stone Platform</div>
            </div>
            <div class="email-content">
                {{.Content}}
            </div>
            <div class="email-footer">
                <p class="footer-text">Este email foi enviado automaticamente pelo sistema CAVA.</p>
                <p class="footer-text">Se você não solicitou esta mensagem, pode ignorá-la com segurança.</p>
                <p class="footer-brand">© 2025 CAVA Stone Platform</p>
            </div>
        </div>
    </div>
</body>
</html>
`

	welcomeContent = `
<h1>Bem-vindo à CAVA! 🎉</h1>
<p>Olá, <strong>{{.UserName}}</strong>!</p>
<p>Sua conta foi criada com sucesso na plataforma <strong>{{.CompanyName}}</strong>. Você já pode acessar o sistema e explorar todas as funcionalidades disponíveis.</p>

{{if .Email}}
<div class="credentials-list">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E5E5;">
                <span style="font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.05em;">Email de acesso</span>
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E5E5; text-align: right;">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: #121212; background-color: #FFFFFF; padding: 8px 12px; border-radius: 6px; border: 1px solid #E5E5E5;">{{.Email}}</span>
            </td>
        </tr>
        {{if .Password}}
        <tr>
            <td style="padding: 12px 0;">
                <span style="font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.05em;">Senha temporária</span>
            </td>
            <td style="padding: 12px 0; text-align: right;">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: #121212; background-color: #FFFFFF; padding: 8px 12px; border-radius: 6px; border: 1px solid #E5E5E5;">{{.Password}}</span>
            </td>
        </tr>
        {{end}}
    </table>
</div>
{{end}}

{{if .Password}}
<div class="alert-box">
    <p><strong>⚠️ Importante:</strong> Recomendamos que você altere sua senha no primeiro acesso.</p>
</div>
{{end}}

<div style="text-align: center; margin: 32px 0;">
    <a href="{{.LoginURL}}" class="btn-primary">Acessar Minha Conta →</a>
</div>

<p style="color: #888888; font-size: 14px;">Se você tiver qualquer dúvida, não hesite em entrar em contato com nossa equipe de suporte.</p>
`

	passwordResetContent = `
<h1>Redefinição de Senha</h1>
<p>Olá, <strong>{{.UserName}}</strong>!</p>
<p>Recebemos uma solicitação para redefinir a senha da sua conta. Use o código abaixo para continuar:</p>

<div class="credential-box">
    <div class="credential-label">Seu código de verificação</div>
    <div class="credential-value">{{.Code}}</div>
    <div class="credential-hint">Selecione e copie o código acima</div>
</div>

<div class="alert-box">
    <p><strong>⏱️ Importante:</strong> Este código é válido por <strong>{{.ExpiresIn}}</strong>. Após esse período, você precisará solicitar um novo código.</p>
</div>

<p>Ou, se preferir, clique no botão abaixo para redefinir sua senha diretamente:</p>

<div style="text-align: center; margin: 32px 0;">
    <a href="{{.ResetURL}}" class="btn-primary">Redefinir Minha Senha →</a>
</div>

<div class="divider"></div>

<p style="color: #888888; font-size: 13px;"><strong>Não solicitou essa alteração?</strong> Se você não pediu para redefinir sua senha, pode ignorar este email com segurança. Sua senha permanecerá a mesma.</p>
`

	notificationContent = `
<h1>{{.Title}}</h1>
<p>Olá, <strong>{{.UserName}}</strong>!</p>
<p>{{.Message}}</p>
{{if .ActionURL}}
<div style="text-align: center; margin: 32px 0;">
    <a href="{{.ActionURL}}" class="btn-primary">{{.ActionLabel}} →</a>
</div>
{{end}}
`

	inviteContent = `
<h1>Bem-vindo à CAVA! 🎉</h1>
<p>Olá, <strong>{{.UserName}}</strong>!</p>
<p>Você foi convidado como <strong>{{.RoleDescription}}</strong> para acessar a plataforma CAVA - Stone Platform.</p>

<div class="credentials-list">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #E5E5E5;">
                <span style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 0.1em;">Email de acesso</span>
            </td>
            <td style="padding: 16px 0; border-bottom: 1px solid #E5E5E5; text-align: right;">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: #121212; background-color: #FFFFFF; padding: 10px 14px; border-radius: 6px; border: 1px solid #E5E5E5;">{{.Email}}</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 16px 0;">
                <span style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 0.1em;">Senha temporária</span>
            </td>
            <td style="padding: 16px 0; text-align: right;">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: #121212; background-color: #FFFFFF; padding: 10px 14px; border-radius: 6px; border: 2px dashed #121212;">{{.TemporaryPassword}}</span>
            </td>
        </tr>
    </table>
</div>

<div class="alert-box">
    <p><strong>🔐 Segurança:</strong> Por favor, altere sua senha no primeiro acesso ao sistema.</p>
</div>

<div style="text-align: center; margin: 32px 0;">
    <a href="{{.LoginURL}}" class="btn-primary">Acessar CAVA →</a>
</div>

<p style="color: #888888; font-size: 14px;">Se você tiver qualquer dúvida, não hesite em entrar em contato com nossa equipe de suporte.</p>
`

	offersContent = `
<h1>Ofertas Especiais 🏷️</h1>
<p>Olá, <strong>{{.ClienteName}}</strong>!</p>
<p>Temos algumas ofertas que podem te interessar:</p>

{{if .CustomMessage}}
<div class="info-box">
    <p>💬 {{.CustomMessage}}</p>
</div>
{{end}}

{{range .Links}}
<div style="background: linear-gradient(135deg, #F9F9FB 0%, #F3F3F3 100%); border-radius: 12px; padding: 24px; margin: 20px 0; border: 1px solid #E5E5E5; overflow: hidden;">
    {{if .ImageURL}}
    <div style="margin: -24px -24px 20px -24px; overflow: hidden;">
        <a href="{{.URL}}" style="display: block;">
            <img src="{{.ImageURL}}" alt="{{.Title}}" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
        </a>
    </div>
    {{end}}
    <h3 style="margin: 0 0 12px 0; color: #121212; font-size: 18px; font-weight: 600;">{{.Title}}</h3>
    {{if .Description}}
    <p style="color: #4A4A4A; margin: 0 0 12px 0; font-size: 14px;">{{.Description}}</p>
    {{end}}
    {{if .Price}}
    <p style="font-size: 22px; color: #10B981; font-weight: 700; margin: 12px 0;">{{.Price}}</p>
    {{end}}
    <a href="{{.URL}}" style="display: inline-block; padding: 12px 24px; background-color: #121212; color: #FFFFFF !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px;">Ver Detalhes →</a>
</div>
{{end}}

<div class="divider"></div>

<p style="color: #888888; font-size: 13px;">Este email foi enviado porque você demonstrou interesse em nossos produtos. Se não deseja mais receber estas mensagens, por favor entre em contato.</p>
`
)

// RenderWelcomeEmail gera o HTML do email de boas-vindas
func RenderWelcomeEmail(data WelcomeEmailData) (html string, text string, err error) {
	html, err = renderTemplate("Bem-vindo à CAVA", welcomeContent, data)
	if err != nil {
		return "", "", err
	}

	text = renderWelcomeText(data)
	return html, text, nil
}

// RenderPasswordResetEmail gera o HTML do email de recuperação de senha
func RenderPasswordResetEmail(data PasswordResetData) (html string, text string, err error) {
	html, err = renderTemplate("Redefinição de Senha", passwordResetContent, data)
	if err != nil {
		return "", "", err
	}

	text = renderPasswordResetText(data)
	return html, text, nil
}

// RenderNotificationEmail gera o HTML de notificação genérica
func RenderNotificationEmail(data NotificationData) (html string, text string, err error) {
	html, err = renderTemplate(data.Title, notificationContent, data)
	if err != nil {
		return "", "", err
	}

	text = renderNotificationText(data)
	return html, text, nil
}

// RenderInviteEmail gera o HTML do email de convite
func RenderInviteEmail(data InviteEmailData) (html string, text string, err error) {
	html, err = renderTemplate("Convite para CAVA", inviteContent, data)
	if err != nil {
		return "", "", err
	}

	text = renderInviteText(data)
	return html, text, nil
}

// RenderOffersEmail gera o HTML do email de ofertas para clientes
func RenderOffersEmail(data OffersEmailData) (html string, text string, err error) {
	html, err = renderTemplate("Ofertas Especiais - CAVA", offersContent, data)
	if err != nil {
		return "", "", err
	}

	text = renderOffersText(data)
	return html, text, nil
}

// renderTemplate renderiza um template com o conteúdo específico
func renderTemplate(title string, content string, data interface{}) (string, error) {
	// Criar struct para o template base
	type baseData struct {
		Title   string
		Content template.HTML
	}

	// Renderizar o conteúdo específico primeiro
	contentTmpl, err := template.New("content").Parse(content)
	if err != nil {
		return "", err
	}

	var contentBuf bytes.Buffer
	if err := contentTmpl.Execute(&contentBuf, data); err != nil {
		return "", err
	}

	// Renderizar o template base com o conteúdo
	baseTmpl, err := template.New("base").Parse(baseTemplate)
	if err != nil {
		return "", err
	}

	var baseBuf bytes.Buffer
	if err := baseTmpl.Execute(&baseBuf, baseData{
		Title:   title,
		Content: template.HTML(contentBuf.String()),
	}); err != nil {
		return "", err
	}

	return baseBuf.String(), nil
}

// Versões em texto plano dos emails (para clientes que não suportam HTML)

func renderWelcomeText(data WelcomeEmailData) string {
	text := `═══════════════════════════════════════════
            CAVA STONE PLATFORM
═══════════════════════════════════════════

Bem-vindo à CAVA! 🎉

Olá, ` + data.UserName + `!

Sua conta foi criada com sucesso na plataforma ` + data.CompanyName + `.
Você já pode acessar o sistema e explorar todas as funcionalidades disponíveis.
`

	if data.Email != "" {
		text += `
───────────────────────────────────────────
SUAS CREDENCIAIS DE ACESSO
───────────────────────────────────────────

Email: ` + data.Email
	}

	if data.Password != "" {
		text += `
Senha: ` + data.Password + `

⚠️ IMPORTANTE: Recomendamos que você altere sua senha no primeiro acesso.`
	}

	text += `

───────────────────────────────────────────

Acesse sua conta: ` + data.LoginURL + `

Se você tiver qualquer dúvida, não hesite em entrar em contato com nossa equipe de suporte.

───────────────────────────────────────────
Este email foi enviado automaticamente pelo sistema CAVA.
© 2025 CAVA Stone Platform
`
	return text
}

func renderPasswordResetText(data PasswordResetData) string {
	return `═══════════════════════════════════════════
            CAVA STONE PLATFORM
═══════════════════════════════════════════

Redefinição de Senha

Olá, ` + data.UserName + `!

Recebemos uma solicitação para redefinir a senha da sua conta.

───────────────────────────────────────────
SEU CÓDIGO DE VERIFICAÇÃO
───────────────────────────────────────────

    ` + data.Code + `

───────────────────────────────────────────

⏱️ IMPORTANTE: Este código é válido por ` + data.ExpiresIn + `.
Após esse período, você precisará solicitar um novo código.

Ou acesse diretamente: ` + data.ResetURL + `

───────────────────────────────────────────

Não solicitou essa alteração?
Se você não pediu para redefinir sua senha, pode ignorar este email com segurança.
Sua senha permanecerá a mesma.

───────────────────────────────────────────
Este email foi enviado automaticamente pelo sistema CAVA.
© 2025 CAVA Stone Platform
`
}

func renderNotificationText(data NotificationData) string {
	text := `═══════════════════════════════════════════
            CAVA STONE PLATFORM
═══════════════════════════════════════════

` + data.Title + `

Olá, ` + data.UserName + `!

` + data.Message

	if data.ActionURL != "" {
		text += `

` + data.ActionLabel + `: ` + data.ActionURL
	}

	text += `

───────────────────────────────────────────
Este email foi enviado automaticamente pelo sistema CAVA.
© 2025 CAVA Stone Platform
`
	return text
}

func renderInviteText(data InviteEmailData) string {
	return `═══════════════════════════════════════════
            CAVA STONE PLATFORM
═══════════════════════════════════════════

Bem-vindo à CAVA! 🎉

Olá, ` + data.UserName + `!

Você foi convidado como ` + data.RoleDescription + ` para acessar a plataforma CAVA.

───────────────────────────────────────────
SUAS CREDENCIAIS DE ACESSO
───────────────────────────────────────────

Email: ` + data.Email + `
Senha: ` + data.TemporaryPassword + `

🔐 IMPORTANTE: Por segurança, altere sua senha no primeiro acesso.

───────────────────────────────────────────

Acesse agora: ` + data.LoginURL + `

Se você tiver qualquer dúvida, não hesite em entrar em contato com nossa equipe de suporte.

───────────────────────────────────────────
Este email foi enviado automaticamente pelo sistema CAVA.
© 2025 CAVA Stone Platform
`
}

func renderOffersText(data OffersEmailData) string {
	text := `═══════════════════════════════════════════
            CAVA STONE PLATFORM
═══════════════════════════════════════════

Ofertas Especiais 🏷️

Olá, ` + data.ClienteName + `!

Temos algumas ofertas que podem te interessar:
`

	if data.CustomMessage != "" {
		text += `
💬 Mensagem: ` + data.CustomMessage + `
`
	}

	for i, link := range data.Links {
		text += `
───────────────────────────────────────────
` + string(rune('0'+i+1)) + `. ` + link.Title
		if link.Description != "" {
			text += `
   ` + link.Description
		}
		if link.Price != "" {
			text += `
   Preço: ` + link.Price
		}
		if link.ImageURL != "" {
			text += `
   📷 Imagem: ` + link.ImageURL
		}
		text += `
   🔗 Ver oferta: ` + link.URL
	}

	text += `

───────────────────────────────────────────
Este email foi enviado porque você demonstrou interesse em nossos produtos.
Se não deseja mais receber estas mensagens, por favor entre em contato.
© 2025 CAVA Stone Platform
`
	return text
}
