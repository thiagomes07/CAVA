-- =============================================
-- Migration: 000006_seed_data
-- Description: Dados iniciais para desenvolvimento
-- ATENÇÃO: Executar apenas em ambiente de desenvolvimento!
-- =============================================

-- Verificar se já existe seed data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM industries WHERE slug = 'pedras-demo') THEN
        RAISE NOTICE 'Seed data já existe. Pulando inserção.';
        RETURN;
    END IF;

    -- Inserir indústria demo (apenas ID para vínculo)
    INSERT INTO industries (id, name, cnpj, slug, contact_email)
    VALUES (
        '00000000-0000-0000-0000-000000000001',
        '', -- Nome vazio
        NULL, -- CNPJ vazio
        'temp-slug', -- Slug placeholder
        '' -- Email vazio
    );

    -- Inserir usuário Admin Demo
    -- Senha: Admin@123
    INSERT INTO users (id, industry_id, name, email, password_hash, phone, role, is_active)
    VALUES (
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000001',
        'Admin Demo',
        'admin@pedrasdemo.com',
        '$argon2id$v=19$m=65536,t=3,p=2$e+PgXVFIINHjqXqPrEsBFA$syHXXvw5BxxkPEBrOB2xNMWWeLc4A29oZtNXb8NHsPI', -- Senha: Admin@123
        '11988888888',
        'ADMIN_INDUSTRIA',
        TRUE
    );

    -- Inserir usuário Vendedor Demo
    INSERT INTO users (id, industry_id, name, email, password_hash, phone, role, is_active)
    VALUES (
        '00000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000001',
        'Vendedor Demo',
        'vendedor@pedrasdemo.com',
        '$argon2id$v=19$m=65536,t=3,p=2$gUsuG6MQC32Trsmdfb1mXQ$r38pHnSF6SKd00DWJVUhIO8h/AiqZyUZRYBcTJGtTn0', -- Senha: Vendedor@123
        '11977777777',
        'VENDEDOR_INTERNO',
        TRUE
    );

    -- Inserir usuário Broker Demo
    INSERT INTO users (id, industry_id, name, email, password_hash, phone, role, is_active)
    VALUES (
        '00000000-0000-0000-0000-000000000013',
        NULL, -- Broker freelancer
        'Broker Demo',
        'broker@example.com',
        '$argon2id$v=19$m=65536,t=3,p=2$KlwgNJFk/DQaGxZEQyK6Vg$6xpp0oWKpuoxJ2NPCT+VoATVplB16v7+a0cT1qxYRbI', -- Senha: Broker@123
        '11966666666',
        'BROKER',
        TRUE
    );

    -- Inserir produtos demo
    INSERT INTO products (id, industry_id, name, sku_code, description, material_type, finish_type, is_public_catalog)
    VALUES 
    (
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000001',
        'Mármore Carrara',
        'MAR-CAR-001',
        'Mármore Carrara branco com veios cinzas. Origem: Itália.',
        'MARMORE',
        'POLIDO',
        TRUE
    ),
    (
        '00000000-0000-0000-0000-000000000022',
        '00000000-0000-0000-0000-000000000001',
        'Granito Preto São Gabriel',
        'GRA-PSG-001',
        'Granito preto com fundo uniforme. Origem: Brasil.',
        'GRANITO',
        'POLIDO',
        TRUE
    ),
    (
        '00000000-0000-0000-0000-000000000023',
        '00000000-0000-0000-0000-000000000001',
        'Quartzito Azul Macaubas',
        'QUA-AZU-001',
        'Quartzito com tons azulados. Origem: Brasil.',
        'QUARTZITO',
        'LEVIGADO',
        TRUE
    );

    -- Inserir lotes demo
    INSERT INTO batches (
        id, product_id, industry_id, batch_code, 
        height, width, thickness, quantity_slabs,
        available_slabs, reserved_slabs, sold_slabs, inactive_slabs,
        industry_price, status, origin_quarry, entry_date
    )
    VALUES 
    (
        '00000000-0000-0000-0000-000000000031',
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000001',
        'CAR-000001',
        280.00, 180.00, 2.00, 20,
        20, 0, 0, 0,
        15000.00, 'DISPONIVEL', 'Pedreira Carrara - Itália',
        CURRENT_TIMESTAMP - INTERVAL '30 days'
    ),
    (
        '00000000-0000-0000-0000-000000000032',
        '00000000-0000-0000-0000-000000000022',
        '00000000-0000-0000-0000-000000000001',
        'PSG-000001',
        300.00, 200.00, 3.00, 15,
        15, 0, 0, 0,
        12000.00, 'DISPONIVEL', 'Pedreira São Gabriel - ES',
        CURRENT_TIMESTAMP - INTERVAL '20 days'
    ),
    (
        '00000000-0000-0000-0000-000000000033',
        '00000000-0000-0000-0000-000000000023',
        '00000000-0000-0000-0000-000000000001',
        'AZU-000001',
        290.00, 190.00, 2.50, 18,
        13, 5, 0, 0,
        18000.00, 'RESERVADO', 'Pedreira Macaubas - BA',
        CURRENT_TIMESTAMP - INTERVAL '15 days'
    ),
    (
        '00000000-0000-0000-0000-000000000034',
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000001',
        'CAR-000002',
        280.00, 180.00, 2.00, 25,
        0, 0, 25, 0,
        16000.00, 'VENDIDO', 'Pedreira Carrara - Itália',
        CURRENT_TIMESTAMP - INTERVAL '60 days'
    );

    -- Inserir mídia placeholder para produtos
    INSERT INTO product_medias (product_id, url, display_order, is_cover, media_type)
    VALUES 
    (
        '00000000-0000-0000-0000-000000000021',
        'https://via.placeholder.com/800x600/FFFFFF/000000?text=Marmore+Carrara',
        0, TRUE, 'IMAGE'
    ),
    (
        '00000000-0000-0000-0000-000000000022',
        'https://via.placeholder.com/800x600/000000/FFFFFF?text=Granito+Preto',
        0, TRUE, 'IMAGE'
    ),
    (
        '00000000-0000-0000-0000-000000000023',
        'https://via.placeholder.com/800x600/0000FF/FFFFFF?text=Quartzito+Azul',
        0, TRUE, 'IMAGE'
    );

    RAISE NOTICE 'Seed data inserido com sucesso!';
    RAISE NOTICE 'Login Admin: admin@pedrasdemo.com / Admin@123';
    RAISE NOTICE 'Login Vendedor: vendedor@pedrasdemo.com / Vendedor@123';
    RAISE NOTICE 'Login Broker: broker@example.com / Broker@123';
    RAISE NOTICE 'ATENÇÃO: Trocar senhas em produção!';
END $$;
