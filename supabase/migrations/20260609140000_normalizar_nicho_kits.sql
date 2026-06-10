-- Nicho dos kits estava inconsistente ('churrasco' e 'Kits-Churrasco' misturados),
-- fazendo o site (landpage) exibir só 6 dos 10 kits. Padroniza no formato minúsculo,
-- consistente com os nichos das ofertas ('acougue', 'padaria').
-- Nota: nicho NÃO está nas colunas observadas pelo produtos_embedding_trigger — sem efeito em embeddings.
UPDATE produtos SET nicho = 'churrasco' WHERE nicho = 'Kits-Churrasco';
