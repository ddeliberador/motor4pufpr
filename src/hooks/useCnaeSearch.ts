/**
 * MOTOR 4P UFPR - useCnaeSearch Hook
 * Hook para buscar CNAEs oficiais baseados em termo de pesquisa
 */
import { useState, useCallback } from 'react';
import type { CnaeCode } from '@/components/mvp/CnaeSelectionModal';

// Base oficial de CNAEs mais comuns para matching inicial
// Em produção, isso viria de uma API do IBGE/Receita Federal
const CNAE_DATABASE: CnaeCode[] = [
  // Indústria de Transformação - Fabricação de produtos
  { code: '20.19-3/99', description: 'Fabricação de outros produtos químicos inorgânicos não especificados anteriormente', section: 'C - Indústrias de transformação', division: '20 - Fabricação de produtos químicos' },
  { code: '20.29-1/00', description: 'Fabricação de produtos químicos orgânicos não especificados anteriormente', section: 'C - Indústrias de transformação', division: '20 - Fabricação de produtos químicos' },
  { code: '20.31-2/00', description: 'Fabricação de resinas termoplásticas', section: 'C - Indústrias de transformação', division: '20 - Fabricação de produtos químicos' },
  { code: '20.32-1/00', description: 'Fabricação de resinas termofixas', section: 'C - Indústrias de transformação', division: '20 - Fabricação de produtos químicos' },
  { code: '20.51-7/00', description: 'Fabricação de defensivos agrícolas', section: 'C - Indústrias de transformação', division: '20 - Fabricação de produtos químicos' },
  { code: '20.71-1/00', description: 'Fabricação de tintas, vernizes, esmaltes e lacas', section: 'C - Indústrias de transformação', division: '20 - Fabricação de produtos químicos' },
  { code: '20.93-2/00', description: 'Fabricação de aditivos de uso industrial', section: 'C - Indústrias de transformação', division: '20 - Fabricação de produtos químicos' },
  { code: '21.21-1/01', description: 'Fabricação de medicamentos alopáticos para uso humano', section: 'C - Indústrias de transformação', division: '21 - Fabricação de produtos farmoquímicos e farmacêuticos' },
  { code: '21.22-0/00', description: 'Fabricação de medicamentos homeopáticos para uso humano', section: 'C - Indústrias de transformação', division: '21 - Fabricação de produtos farmoquímicos e farmacêuticos' },
  { code: '21.10-6/00', description: 'Fabricação de produtos farmoquímicos', section: 'C - Indústrias de transformação', division: '21 - Fabricação de produtos farmoquímicos e farmacêuticos' },
  { code: '21.23-8/00', description: 'Fabricação de preparações farmacêuticas', section: 'C - Indústrias de transformação', division: '21 - Fabricação de produtos farmoquímicos e farmacêuticos' },
  { code: '26.10-8/00', description: 'Fabricação de componentes eletrônicos', section: 'C - Indústrias de transformação', division: '26 - Fabricação de equipamentos de informática, produtos eletrônicos e ópticos' },
  { code: '26.21-3/00', description: 'Fabricação de equipamentos de informática', section: 'C - Indústrias de transformação', division: '26 - Fabricação de equipamentos de informática, produtos eletrônicos e ópticos' },
  { code: '26.22-1/00', description: 'Fabricação de periféricos para equipamentos de informática', section: 'C - Indústrias de transformação', division: '26 - Fabricação de equipamentos de informática, produtos eletrônicos e ópticos' },
  { code: '26.31-1/00', description: 'Fabricação de equipamentos transmissores de comunicação', section: 'C - Indústrias de transformação', division: '26 - Fabricação de equipamentos de informática, produtos eletrônicos e ópticos' },
  { code: '26.32-9/00', description: 'Fabricação de aparelhos telefônicos e de outros equipamentos de comunicação', section: 'C - Indústrias de transformação', division: '26 - Fabricação de equipamentos de informática, produtos eletrônicos e ópticos' },
  { code: '26.40-0/00', description: 'Fabricação de aparelhos de recepção, reprodução, gravação e amplificação de áudio e vídeo', section: 'C - Indústrias de transformação', division: '26 - Fabricação de equipamentos de informática, produtos eletrônicos e ópticos' },
  { code: '26.51-5/00', description: 'Fabricação de aparelhos e equipamentos de medida, teste e controle', section: 'C - Indústrias de transformação', division: '26 - Fabricação de equipamentos de informática, produtos eletrônicos e ópticos' },
  { code: '26.70-1/02', description: 'Fabricação de equipamentos fotográficos e cinematográficos', section: 'C - Indústrias de transformação', division: '26 - Fabricação de equipamentos de informática, produtos eletrônicos e ópticos' },
  { code: '27.10-4/01', description: 'Fabricação de geradores de corrente contínua e alternada', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '27.10-4/02', description: 'Fabricação de transformadores, indutores, conversores, sincronizadores e semelhantes', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '27.10-4/03', description: 'Fabricação de motores elétricos', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '27.21-0/00', description: 'Fabricação de pilhas, baterias e acumuladores elétricos, exceto para veículos automotores', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '27.22-8/01', description: 'Fabricação de baterias e acumuladores para veículos automotores', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '27.31-7/00', description: 'Fabricação de aparelhos e equipamentos para distribuição e controle de energia elétrica', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '27.32-5/00', description: 'Fabricação de material elétrico para instalações em circuito de consumo', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '27.33-3/00', description: 'Fabricação de fios, cabos e condutores elétricos isolados', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '27.40-6/01', description: 'Fabricação de lâmpadas', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '27.40-6/02', description: 'Fabricação de luminárias e outros equipamentos de iluminação', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '27.51-1/00', description: 'Fabricação de fogões, refrigeradores e máquinas de lavar e secar para uso doméstico', section: 'C - Indústrias de transformação', division: '27 - Fabricação de máquinas, aparelhos e materiais elétricos' },
  { code: '28.11-9/00', description: 'Fabricação de motores e turbinas, exceto para aviões e veículos rodoviários', section: 'C - Indústrias de transformação', division: '28 - Fabricação de máquinas e equipamentos' },
  { code: '28.12-7/00', description: 'Fabricação de equipamentos hidráulicos e pneumáticos, exceto válvulas', section: 'C - Indústrias de transformação', division: '28 - Fabricação de máquinas e equipamentos' },
  { code: '28.21-6/01', description: 'Fabricação de fornos industriais, aparelhos e equipamentos não elétricos para instalações térmicas', section: 'C - Indústrias de transformação', division: '28 - Fabricação de máquinas e equipamentos' },
  { code: '28.22-4/01', description: 'Fabricação de máquinas e equipamentos para a agricultura e pecuária', section: 'C - Indústrias de transformação', division: '28 - Fabricação de máquinas e equipamentos' },
  { code: '28.25-9/00', description: 'Fabricação de máquinas e equipamentos de refrigeração e ventilação para uso industrial e comercial', section: 'C - Indústrias de transformação', division: '28 - Fabricação de máquinas e equipamentos' },
  { code: '28.29-1/99', description: 'Fabricação de outras máquinas e equipamentos de uso geral não especificados anteriormente', section: 'C - Indústrias de transformação', division: '28 - Fabricação de máquinas e equipamentos' },
  { code: '28.40-2/00', description: 'Fabricação de máquinas-ferramenta', section: 'C - Indústrias de transformação', division: '28 - Fabricação de máquinas e equipamentos' },
  { code: '28.61-5/00', description: 'Fabricação de máquinas para a indústria metalúrgica', section: 'C - Indústrias de transformação', division: '28 - Fabricação de máquinas e equipamentos' },
  { code: '28.66-6/00', description: 'Fabricação de máquinas e equipamentos para a indústria do plástico', section: 'C - Indústrias de transformação', division: '28 - Fabricação de máquinas e equipamentos' },
  { code: '29.10-7/01', description: 'Fabricação de automóveis, camionetas e utilitários', section: 'C - Indústrias de transformação', division: '29 - Fabricação de veículos automotores, reboques e carrocerias' },
  { code: '29.20-4/01', description: 'Fabricação de caminhões e ônibus', section: 'C - Indústrias de transformação', division: '29 - Fabricação de veículos automotores, reboques e carrocerias' },
  { code: '29.41-7/00', description: 'Fabricação de peças e acessórios para o sistema motor de veículos automotores', section: 'C - Indústrias de transformação', division: '29 - Fabricação de veículos automotores, reboques e carrocerias' },
  { code: '29.42-5/00', description: 'Fabricação de peças e acessórios para os sistemas de marcha e transmissão de veículos automotores', section: 'C - Indústrias de transformação', division: '29 - Fabricação de veículos automotores, reboques e carrocerias' },
  { code: '29.43-3/00', description: 'Fabricação de peças e acessórios para o sistema de freios de veículos automotores', section: 'C - Indústrias de transformação', division: '29 - Fabricação de veículos automotores, reboques e carrocerias' },
  { code: '29.44-1/00', description: 'Fabricação de peças e acessórios para o sistema de direção e suspensão de veículos automotores', section: 'C - Indústrias de transformação', division: '29 - Fabricação de veículos automotores, reboques e carrocerias' },
  { code: '29.45-0/00', description: 'Fabricação de material elétrico e eletrônico para veículos automotores', section: 'C - Indústrias de transformação', division: '29 - Fabricação de veículos automotores, reboques e carrocerias' },
  { code: '30.11-3/01', description: 'Construção de embarcações de grande porte', section: 'C - Indústrias de transformação', division: '30 - Fabricação de outros equipamentos de transporte' },
  { code: '30.41-5/00', description: 'Fabricação de aeronaves', section: 'C - Indústrias de transformação', division: '30 - Fabricação de outros equipamentos de transporte' },
  { code: '30.42-3/00', description: 'Fabricação de turbinas, motores e outros componentes e peças para aeronaves', section: 'C - Indústrias de transformação', division: '30 - Fabricação de outros equipamentos de transporte' },
  { code: '32.50-7/01', description: 'Fabricação de instrumentos não eletrônicos e utensílios para uso médico, cirúrgico, odontológico e de laboratório', section: 'C - Indústrias de transformação', division: '32 - Fabricação de produtos diversos' },
  { code: '32.50-7/02', description: 'Fabricação de mobiliário para uso médico, cirúrgico, odontológico e de laboratório', section: 'C - Indústrias de transformação', division: '32 - Fabricação de produtos diversos' },
  { code: '32.50-7/03', description: 'Fabricação de aparelhos e utensílios para correção de defeitos físicos e aparelhos ortopédicos', section: 'C - Indústrias de transformação', division: '32 - Fabricação de produtos diversos' },
  { code: '32.50-7/04', description: 'Fabricação de equipamentos e artigos médico-hospitalares', section: 'C - Indústrias de transformação', division: '32 - Fabricação de produtos diversos' },
  { code: '32.50-7/05', description: 'Fabricação de materiais para medicina e odontologia', section: 'C - Indústrias de transformação', division: '32 - Fabricação de produtos diversos' },
  // Serviços de TI e Tecnologia
  { code: '62.01-5/00', description: 'Desenvolvimento de programas de computador sob encomenda', section: 'J - Informação e comunicação', division: '62 - Atividades dos serviços de tecnologia da informação' },
  { code: '62.02-3/00', description: 'Desenvolvimento e licenciamento de programas de computador customizáveis', section: 'J - Informação e comunicação', division: '62 - Atividades dos serviços de tecnologia da informação' },
  { code: '62.03-1/00', description: 'Desenvolvimento e licenciamento de programas de computador não customizáveis', section: 'J - Informação e comunicação', division: '62 - Atividades dos serviços de tecnologia da informação' },
  { code: '62.04-0/00', description: 'Consultoria em tecnologia da informação', section: 'J - Informação e comunicação', division: '62 - Atividades dos serviços de tecnologia da informação' },
  { code: '62.09-1/00', description: 'Suporte técnico, manutenção e outros serviços em tecnologia da informação', section: 'J - Informação e comunicação', division: '62 - Atividades dos serviços de tecnologia da informação' },
  { code: '63.11-9/00', description: 'Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet', section: 'J - Informação e comunicação', division: '63 - Atividades de prestação de serviços de informação' },
  { code: '63.19-4/00', description: 'Portais, provedores de conteúdo e outros serviços de informação na internet', section: 'J - Informação e comunicação', division: '63 - Atividades de prestação de serviços de informação' },
  // Pesquisa e Desenvolvimento
  { code: '72.10-0/00', description: 'Pesquisa e desenvolvimento experimental em ciências físicas e naturais', section: 'M - Atividades profissionais, científicas e técnicas', division: '72 - Pesquisa e desenvolvimento científico' },
  { code: '72.20-7/00', description: 'Pesquisa e desenvolvimento experimental em ciências sociais e humanas', section: 'M - Atividades profissionais, científicas e técnicas', division: '72 - Pesquisa e desenvolvimento científico' },
  // Energia
  { code: '35.11-5/00', description: 'Geração de energia elétrica', section: 'D - Eletricidade e gás', division: '35 - Eletricidade, gás e outras utilidades' },
  { code: '35.12-3/00', description: 'Transmissão de energia elétrica', section: 'D - Eletricidade e gás', division: '35 - Eletricidade, gás e outras utilidades' },
  { code: '35.13-1/00', description: 'Comércio atacadista de energia elétrica', section: 'D - Eletricidade e gás', division: '35 - Eletricidade, gás e outras utilidades' },
  { code: '35.14-0/00', description: 'Distribuição de energia elétrica', section: 'D - Eletricidade e gás', division: '35 - Eletricidade, gás e outras utilidades' },
  // Mineração e Extração
  { code: '07.10-3/01', description: 'Extração de minério de ferro', section: 'B - Indústrias extrativas', division: '07 - Extração de minerais metálicos' },
  { code: '07.21-9/01', description: 'Extração de minério de alumínio', section: 'B - Indústrias extrativas', division: '07 - Extração de minerais metálicos' },
  { code: '07.23-5/01', description: 'Extração de minério de manganês', section: 'B - Indústrias extrativas', division: '07 - Extração de minerais metálicos' },
  { code: '07.24-3/01', description: 'Extração de minério de ouro', section: 'B - Indústrias extrativas', division: '07 - Extração de minerais metálicos' },
  { code: '07.25-1/00', description: 'Extração de minerais radioativos', section: 'B - Indústrias extrativas', division: '07 - Extração de minerais metálicos' },
  { code: '07.29-4/01', description: 'Extração de minérios de nióbio e titânio', section: 'B - Indústrias extrativas', division: '07 - Extração de minerais metálicos' },
  { code: '07.29-4/02', description: 'Extração de minério de tungstênio', section: 'B - Indústrias extrativas', division: '07 - Extração de minerais metálicos' },
  { code: '07.29-4/03', description: 'Extração de minério de níquel', section: 'B - Indústrias extrativas', division: '07 - Extração de minerais metálicos' },
  { code: '07.29-4/04', description: 'Extração de minérios de cobre, chumbo, zinco e outros minerais metálicos não ferrosos não especificados anteriormente', section: 'B - Indústrias extrativas', division: '07 - Extração de minerais metálicos' },
  { code: '08.91-6/00', description: 'Extração de minerais para fabricação de adubos, fertilizantes e outros produtos químicos', section: 'B - Indústrias extrativas', division: '08 - Extração de minerais não metálicos' },
  { code: '08.99-1/01', description: 'Extração de grafita', section: 'B - Indústrias extrativas', division: '08 - Extração de minerais não metálicos' },
  { code: '08.99-1/02', description: 'Extração de quartzo', section: 'B - Indústrias extrativas', division: '08 - Extração de minerais não metálicos' },
  { code: '08.99-1/03', description: 'Extração de amianto', section: 'B - Indústrias extrativas', division: '08 - Extração de minerais não metálicos' },
  { code: '08.99-1/05', description: 'Extração de outros minerais não metálicos não especificados anteriormente', section: 'B - Indústrias extrativas', division: '08 - Extração de minerais não metálicos' },
  // Biotecnologia e Agro
  { code: '01.41-5/01', description: 'Produção de sementes certificadas, exceto de forrageiras para formação de pasto', section: 'A - Agricultura, pecuária, produção florestal, pesca e aquicultura', division: '01 - Agricultura, pecuária e serviços relacionados' },
  { code: '01.41-5/02', description: 'Produção de sementes certificadas de forrageiras para formação de pasto', section: 'A - Agricultura, pecuária, produção florestal, pesca e aquicultura', division: '01 - Agricultura, pecuária e serviços relacionados' },
  { code: '01.61-0/01', description: 'Serviço de pulverização e controle de pragas agrícolas', section: 'A - Agricultura, pecuária, produção florestal, pesca e aquicultura', division: '01 - Agricultura, pecuária e serviços relacionados' },
  { code: '01.62-8/99', description: 'Outras atividades de apoio à pecuária', section: 'A - Agricultura, pecuária, produção florestal, pesca e aquicultura', division: '01 - Agricultura, pecuária e serviços relacionados' },
  // Metalurgia
  { code: '24.11-3/00', description: 'Produção de ferro-gusa', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.12-1/00', description: 'Produção de ferroligas', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.21-1/00', description: 'Produção de semiacabados de aço', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.22-9/01', description: 'Produção de laminados planos de aço ao carbono, revestidos ou não', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.31-8/00', description: 'Produção de tubos de aço com costura', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.41-5/01', description: 'Produção de alumínio e suas ligas em formas primárias', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.42-3/00', description: 'Metalurgia dos metais preciosos', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.43-1/00', description: 'Metalurgia do cobre', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.49-1/01', description: 'Produção de zinco em formas primárias', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.49-1/02', description: 'Produção de laminados de zinco', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.49-1/03', description: 'Fabricação de ânodos para galvanoplastia', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.49-1/99', description: 'Metalurgia de outros metais não ferrosos e suas ligas não especificados anteriormente', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.51-2/00', description: 'Fundição de ferro e aço', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
  { code: '24.52-1/00', description: 'Fundição de metais não ferrosos e suas ligas', section: 'C - Indústrias de transformação', division: '24 - Metalurgia' },
];

// Keywords para matching de termos tecnológicos
const KEYWORD_MAPPINGS: Record<string, string[]> = {
  'bateria': ['27.21-0/00', '27.22-8/01', '26.10-8/00', '29.45-0/00'],
  'baterias': ['27.21-0/00', '27.22-8/01', '26.10-8/00', '29.45-0/00'],
  'lítio': ['27.21-0/00', '27.22-8/01', '07.29-4/04'],
  'sódio': ['27.21-0/00', '20.19-3/99'],
  'semicondutor': ['26.10-8/00', '26.21-3/00', '26.31-1/00'],
  'semicondutores': ['26.10-8/00', '26.21-3/00', '26.31-1/00'],
  'eletrônico': ['26.10-8/00', '26.21-3/00', '26.40-0/00'],
  'eletrônicos': ['26.10-8/00', '26.21-3/00', '26.40-0/00'],
  'grafeno': ['08.99-1/01', '20.19-3/99', '24.49-1/99'],
  'nanotecnologia': ['72.10-0/00', '20.19-3/99', '32.50-7/05'],
  'nanotubo': ['72.10-0/00', '20.19-3/99'],
  'solar': ['35.11-5/00', '26.10-8/00', '27.31-7/00'],
  'fotovoltaico': ['35.11-5/00', '26.10-8/00', '27.31-7/00'],
  'fotovoltaica': ['35.11-5/00', '26.10-8/00', '27.31-7/00'],
  'energia': ['35.11-5/00', '35.12-3/00', '35.14-0/00', '27.10-4/01'],
  'eólico': ['35.11-5/00', '28.11-9/00'],
  'eólica': ['35.11-5/00', '28.11-9/00'],
  'inteligência artificial': ['62.01-5/00', '62.02-3/00', '62.03-1/00', '72.10-0/00'],
  'ia': ['62.01-5/00', '62.02-3/00', '62.03-1/00', '72.10-0/00'],
  'machine learning': ['62.01-5/00', '62.02-3/00', '72.10-0/00'],
  'software': ['62.01-5/00', '62.02-3/00', '62.03-1/00'],
  'computador': ['26.21-3/00', '26.22-1/00', '62.01-5/00'],
  'medicamento': ['21.10-6/00', '21.21-1/01', '21.23-8/00'],
  'fármaco': ['21.10-6/00', '21.21-1/01', '21.23-8/00'],
  'farmacêutico': ['21.10-6/00', '21.21-1/01', '21.23-8/00'],
  'biotecnologia': ['72.10-0/00', '21.10-6/00', '01.41-5/01'],
  'biofármaco': ['21.10-6/00', '21.21-1/01', '72.10-0/00'],
  'vacina': ['21.21-1/01', '21.23-8/00', '72.10-0/00'],
  'implante': ['32.50-7/03', '32.50-7/04', '32.50-7/05'],
  'biomaterial': ['32.50-7/05', '20.29-1/00', '72.10-0/00'],
  'prótese': ['32.50-7/03', '32.50-7/04'],
  'médico': ['32.50-7/01', '32.50-7/04', '32.50-7/05'],
  'automotivo': ['29.10-7/01', '29.41-7/00', '29.45-0/00'],
  'veículo': ['29.10-7/01', '29.20-4/01', '29.41-7/00'],
  'elétrico': ['27.10-4/01', '27.10-4/03', '27.33-3/00', '29.45-0/00'],
  'aço': ['24.11-3/00', '24.21-1/00', '24.22-9/01', '24.51-2/00'],
  'alumínio': ['07.21-9/01', '24.41-5/01', '24.52-1/00'],
  'cobre': ['07.29-4/04', '24.43-1/00', '27.33-3/00'],
  'minério': ['07.10-3/01', '07.21-9/01', '07.29-4/01'],
  'mineração': ['07.10-3/01', '07.21-9/01', '08.91-6/00'],
  'químico': ['20.19-3/99', '20.29-1/00', '20.93-2/00'],
  'agroquímico': ['20.51-7/00', '01.61-0/01'],
  'defensivo': ['20.51-7/00', '01.61-0/01'],
  'fertilizante': ['08.91-6/00', '20.19-3/99'],
  'semente': ['01.41-5/01', '01.41-5/02'],
  'aeronave': ['30.41-5/00', '30.42-3/00'],
  'aviação': ['30.41-5/00', '30.42-3/00'],
  'drone': ['30.41-5/00', '26.31-1/00'],
  'telecomunicação': ['26.31-1/00', '26.32-9/00'],
  '5g': ['26.31-1/00', '26.32-9/00', '62.01-5/00'],
  'iot': ['26.31-1/00', '62.01-5/00', '62.04-0/00'],
  'internet das coisas': ['26.31-1/00', '62.01-5/00', '62.04-0/00'],
  'pesquisa': ['72.10-0/00', '72.20-7/00'],
  'p&d': ['72.10-0/00', '72.20-7/00'],
};

interface UseCnaeSearchReturn {
  searchCnaes: (query: string) => Promise<CnaeCode[]>;
  isLoading: boolean;
  error: string | null;
}

export function useCnaeSearch(): UseCnaeSearchReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCnaes = useCallback(async (query: string): Promise<CnaeCode[]> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simula delay de API
      await new Promise(resolve => setTimeout(resolve, 500));

      const queryTerms = query.toLowerCase().split(/\s+/);
      const matchedCodes = new Set<string>();
      const results: CnaeCode[] = [];

      // 1. Busca por keywords mapeados
      for (const term of queryTerms) {
        // Verifica mapeamentos exatos e parciais
        for (const [keyword, codes] of Object.entries(KEYWORD_MAPPINGS)) {
          if (term.includes(keyword) || keyword.includes(term)) {
            codes.forEach(code => matchedCodes.add(code));
          }
        }
      }

      // 2. Adiciona CNAEs mapeados como matches oficiais
      for (const code of matchedCodes) {
        const cnae = CNAE_DATABASE.find(c => c.code === code);
        if (cnae) {
          results.push({ ...cnae, isOfficialMatch: true });
        }
      }

      // 3. Busca textual na base de CNAEs
      for (const cnae of CNAE_DATABASE) {
        if (matchedCodes.has(cnae.code)) continue; // Já adicionado

        const matchesDescription = queryTerms.some(term =>
          cnae.description.toLowerCase().includes(term) ||
          cnae.section?.toLowerCase().includes(term) ||
          cnae.division?.toLowerCase().includes(term)
        );

        if (matchesDescription) {
          results.push({ ...cnae, isOfficialMatch: false });
        }
      }

      // Ordena: matches oficiais primeiro, depois por código
      results.sort((a, b) => {
        if (a.isOfficialMatch && !b.isOfficialMatch) return -1;
        if (!a.isOfficialMatch && b.isOfficialMatch) return 1;
        return a.code.localeCompare(b.code);
      });

      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar CNAEs';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchCnaes,
    isLoading,
    error,
  };
}

export default useCnaeSearch;
