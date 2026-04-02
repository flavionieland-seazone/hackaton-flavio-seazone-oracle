// Catálogo curado do banco de dados sapron (database_id=2)
// Usado como contexto no tool description do metabase_run_sql
export const SCHEMA_CATALOG = `
SCHEMA DO BANCO PRINCIPAL (database_id=2, sapron, PostgreSQL):

══════════════════════════════════════════
SCHEMA: public (tabelas principais)
══════════════════════════════════════════

property_property (imóveis gerenciados)
  id (PK), code (text, ex: "ILC4107", "EHI0802"), status ("Active"|"Inactive"|"Onboarding"),
  region (text, ex: "Florianópolis, SC, Ponta das Canas"), property_type (text),
  host_id (FK → account_host), owner_id (FK → account_owner),
  address_id (FK → account_address), category_location_id (FK → property_categorylocation)

reservation_reservation (reservas)
  id (PK), code (text), property_id (FK → property_property.id),
  check_in_date (date), check_out_date (date), total_price (numeric),
  status ("Concluded"|"Canceled"|"Pending"|"No-Show"|"Not confirmed"),
  ota_id (FK → reservation_ota), guest_id (FK → account_guest), host_id (FK → account_host)
  ⚠️ COLUNAS QUE NÃO EXISTEM (nunca use): price_cents, amount, value, revenue, created_at, booking_date
  ⚠️ Data da reserva é check_in_date — NÃO use created_at

account_address (endereços)
  id (PK), street, number, neighborhood, city, state, condominium
  JOIN: property_property p JOIN account_address a ON p.address_id = a.id

account_host (anfitriões/franqueados)
  id (PK), name (text), email (text)

account_owner (proprietários)
  id (PK), name (text), email (text)

account_guest (hóspedes)
  id (PK), name (text), email (text)

account_partner (parceiros)
  id (PK), name (text)

reservation_ota (canais de venda)
  id (PK), name (text, ex: "Airbnb", "Booking.com", "Vrbo")
  JOIN: reservation_reservation r JOIN reservation_ota o ON r.ota_id = o.id

property_location (localizações)
  id (PK), code (text), neighborhood, city, state, country

property_categorylocation
  id (PK), category_id (FK → property_category), location_id (FK → property_location)
  JOIN: property_property p JOIN property_categorylocation pcl ON p.category_location_id = pcl.id

property_category
  id (PK), code (text, ex: "FINIR", "JR", "SPOT")

══════════════════════════════════════════
SCHEMA: szi  ⚠️ SEMPRE prefixar com szi.
(Seazone Investimentos / SpotMatch — empreendimentos imobiliários em construção/venda)
══════════════════════════════════════════

szi.spot_buildings (empreendimentos)
  id (PK), full_name (text), short_name (text), city, state, neighborhood,
  building_status ("lancamento"|"aprovacao"|"obra"|"entregue"),
  commercial_status ("lancamento"|"comercializacao"|"marketplace")

szi.spot_building_units (unidades dos empreendimentos)
  id (PK), code (text), total_area (numeric), floor (text),
  status ("disponivel"|"vendida"|"reservada"|"marketplace"|"bloqueada"|"contrato"),
  spot_building_id (FK → szi.spot_buildings.id),
  typology (text), total_capacity (int), net_revenue (numeric), furniture_value (numeric)
  JOIN: szi.spot_building_units u JOIN szi.spot_buildings b ON u.spot_building_id = b.id

szi.spot_building_unit_contracts (contratos de compra de unidades)
  id (PK), percentage_share (numeric), signature_date (date), status (text), type (text),
  spot_building_unit_id (FK → szi.spot_building_units.id), account_investor_id (FK)
  JOIN: szi.spot_building_unit_contracts c JOIN szi.spot_building_units u ON c.spot_building_unit_id = u.id

szi.financing_flows (fluxos de financiamento de contratos)
  id (PK), status (text), base_date (date), spot_building_unit_contract_id (FK)

szi.financing_flow_installments (parcelas dos fluxos)
  id (PK), installment_number, amount (numeric), original_due_date (date),
  status (text), financing_flow_id (FK)

══════════════════════════════════════════
REGRAS DE SQL (siga sempre)
══════════════════════════════════════════

1. SEMPRE use aliases de tabela e qualifique TODAS as colunas: r.status, p.code (nunca só "status" ou "code")
2. Schema szi: SEMPRE prefixar tabelas com "szi." — ex: szi.spot_buildings (nunca só spot_buildings)
3. Receita/faturamento: SUM(r.total_price) — coluna é total_price, NUNCA price_cents/amount/value. Com r.total_price IS NOT NULL e r.status NOT IN ('Canceled','Rejected') e ORDER BY ... DESC NULLS LAST
4. ⚠️ DATAS — DISTINÇÃO OBRIGATÓRIA:
   - "este mês" / "mês atual":       DATE_TRUNC('month', r.check_in_date) = DATE_TRUNC('month', CURRENT_DATE)
   - "último mês" / "mês passado":   DATE_TRUNC('month', r.check_in_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
   - "últimos N dias":               DATE(r.check_in_date) >= CURRENT_DATE - INTERVAL 'N days' AND DATE(r.check_in_date) <= CURRENT_DATE
   NÃO use created_at para filtrar por data — use check_in_date
5. NUNCA pergunte ao usuário a data — use CURRENT_DATE sempre
6. Sem resultados com status='Concluded' → tente incluir 'Confirmed' também
7. Coluna inexistente → use metabase_explore_schema para verificar antes de tentar de novo
8. Unidades disponíveis num empreendimento: WHERE u.status = 'disponivel'
9. Top ranking: GROUP BY + ORDER BY valor DESC NULLS LAST + LIMIT
10. Sempre LIMIT (padrão 50), exceto COUNT/SUM puros
11. Para buscar empreendimento por nome parcial: ILIKE '%nome%'

══════════════════════════════════════════
EXEMPLOS DE QUERIES COMUNS
══════════════════════════════════════════

-- Imóvel que mais faturou este mês:
SELECT p.code, SUM(r.total_price) AS receita
FROM reservation_reservation r
JOIN property_property p ON r.property_id = p.id
WHERE r.total_price IS NOT NULL
  AND r.status NOT IN ('Canceled','Rejected')
  AND DATE_TRUNC('month', r.check_in_date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY p.code
ORDER BY receita DESC NULLS LAST LIMIT 10;

-- Imóvel que mais faturou no mês passado / último mês:
SELECT p.code, SUM(r.total_price) AS receita
FROM reservation_reservation r
JOIN property_property p ON r.property_id = p.id
WHERE r.total_price IS NOT NULL
  AND r.status NOT IN ('Canceled','Rejected')
  AND DATE_TRUNC('month', r.check_in_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
GROUP BY p.code
ORDER BY receita DESC NULLS LAST LIMIT 10;

-- Reservas de um imóvel específico nos últimos 30 dias:
SELECT r.code, r.check_in_date, r.check_out_date, r.status, r.total_price
FROM reservation_reservation r
JOIN property_property p ON r.property_id = p.id
WHERE p.code = 'ILC4107'
  AND DATE(r.check_in_date) >= CURRENT_DATE - INTERVAL '30 days'
  AND DATE(r.check_in_date) <= CURRENT_DATE
ORDER BY r.check_in_date DESC;

-- Unidades disponíveis em um empreendimento Spot:
SELECT u.code, u.typology, u.total_area, u.floor, u.status
FROM szi.spot_building_units u
JOIN szi.spot_buildings b ON u.spot_building_id = b.id
WHERE b.full_name ILIKE '%Ponta das Canas%'
  AND u.status = 'disponivel'
ORDER BY u.floor, u.code;

-- Resumo de unidades por status em um empreendimento:
SELECT u.status, COUNT(*) AS quantidade
FROM szi.spot_building_units u
JOIN szi.spot_buildings b ON u.spot_building_id = b.id
WHERE b.full_name ILIKE '%nome do empreendimento%'
GROUP BY u.status ORDER BY quantidade DESC;
`
