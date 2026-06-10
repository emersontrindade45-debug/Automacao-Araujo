# Como o Sistema Trabalha Por Você — Guia do Proprietário

## Mercado Araujo — Automação de Atendimento via WhatsApp

---

> **Uma coisa só você precisa saber para começar:**
> O sistema funciona dentro do WhatsApp da loja. Você não vai instalar nada, não vai aprender nenhuma ferramenta nova. Tudo que você já sabe fazer — mandar mensagem, ouvir áudio, responder cliente — é o suficiente.

---

## Como funciona no dia a dia

Quando um cliente manda mensagem no WhatsApp da loja, **uma assistente virtual responde automaticamente no lugar de você.** Ela entende o que o cliente quer, busca preços, fecha pedidos, tira dúvidas — tudo sozinha.

Você só entra em cena quando o pedido já está pronto para separar, ou quando a assistente não consegue resolver algo.

---

## O que a assistente faz sozinha

### Quando um cliente novo manda mensagem pela primeira vez

A assistente pede o nome do cliente antes de qualquer atendimento. Ela não usa o nome do perfil do WhatsApp porque nem sempre bate com o nome real.

Depois que o cliente informa o nome, o atendimento segue normalmente.

---

### Quando um cliente pergunta o preço de um produto

A assistente busca no catálogo da loja e responde com o preço e a disponibilidade. O cliente recebe a informação na hora, sem precisar esperar.

> **Para isso funcionar:** o catálogo precisa estar sempre atualizado. Se o preço mudar na prateleira e não for atualizado no sistema, a assistente vai informar o preço errado ao cliente.

---

### Quando um cliente pergunta sobre ofertas ou kits

A assistente lista todas as ofertas e kits que estiverem cadastrados como ativos. Se não houver nada cadastrado, ela não tem o que mostrar.

> **Para isso funcionar:** toda semana que tiver promoção nova, o catálogo precisa ser atualizado.

---

### Quando um cliente quer fazer um pedido

A assistente conduz toda a conversa de venda. Ela:

1. Pergunta quais produtos o cliente quer
2. Verifica o preço e a disponibilidade de cada item
3. Pede o endereço de entrega e valida o CEP automaticamente
4. Pergunta a forma de pagamento
5. Antes de fechar, pergunta: *"Tem mais alguma coisa antes de finalizar?"*
6. Apresenta o resumo completo do pedido
7. Pede a confirmação do cliente
8. Só depois de confirmado, gera o pedido

Você recebe uma notificação e o pedido já aparece organizado com tudo: itens, endereço e valor total.

---

### Quando um cliente quer saber o status do pedido

O cliente manda uma mensagem perguntando onde está o pedido. A assistente responde automaticamente com a etapa atual — se está sendo separado, se saiu para entrega, etc.

---

### Quando um cliente quer falar com uma pessoa

Se o cliente escrever algo como "quero falar com um atendente" ou "preciso de ajuda", a assistente:

1. Para de responder aquele cliente
2. Avisa o cliente que um atendente vai continuar
3. Manda uma notificação para o grupo da equipe no WhatsApp com um **resumo da conversa** gerado automaticamente

O atendente que pegar já sabe o que aconteceu — sem precisar rolar o chat do início.

---

### Quando um cliente que já comprou antes manda mensagem

A assistente reconhece que ele já é cliente e cumprimenta pelo nome. Se o último pedido foi entregue ou cancelado, ela cumprimenta com *"Que bom ter você de volta!"* e começa um atendimento novo — sem mencionar o histórico anterior de forma negativa.

---

### Quando um cliente some no meio do atendimento

Se um cliente iniciou conversa mas não comprou e ficou dias sem responder, o sistema manda mensagens automáticas de reengajamento. São até 3 tentativas, em dias diferentes, com textos diferentes. Se mesmo assim não houver resposta, o sistema para de tentar.

---

## O que você precisa fazer

### Separar e entregar pedidos

Quando a assistente fecha um pedido, **você recebe a notificação** e o pedido já está registrado no sistema com todos os dados. A partir daí, é com você:

- Separar os itens
- Confirmar o valor final (especialmente em produtos por peso, como carnes)
- Sair para entrega
- Confirmar a entrega

A cada etapa que você avança, **o cliente recebe automaticamente uma mensagem no WhatsApp** informando onde está o pedido. Você não precisa mandar essas mensagens — elas saem sozinhas.

---

### Atender clientes após handoff

Quando a assistente não consegue resolver e passa para humano, **você precisa estar disponível para atender.** O cliente está esperando. A notificação vai aparecer no grupo da equipe com o resumo da conversa.

Você abre o WhatsApp da loja e continua o atendimento normalmente, como faria com qualquer cliente.

Quando terminar, **avise o desenvolvedor ou o operador do Hub** para reativar a assistente naquele cliente. Enquanto não for reativada, ela não vai responder mais nenhuma mensagem daquela pessoa.

> **Atenção crítica:** Se ninguém atender após o handoff, o cliente fica sem resposta. Sempre tenha alguém responsável para monitorar o grupo da equipe.

---

### Entrar na conversa quando a assistente estiver errando

Se você perceber que a assistente está respondendo algo errado — ou simplesmente quiser assumir o atendimento naquele momento — **basta entrar na conversa diretamente.** Mande uma mensagem pelo WhatsApp da loja como se fosse você mesmo respondendo o cliente.

A assistente entende que um humano entrou e para de responder automaticamente.

A partir daí, você conduz o atendimento como quiser — sem que ela interfira.

**Para reativar a assistente depois que terminar**, mande uma mensagem no WhatsApp da loja contendo apenas:

> **.**

Só isso. Um ponto final. A assistente volta a responder normalmente a partir daquele cliente.

---

### Atualizar preços e estoque pelo WhatsApp

Você pode atualizar preço ou estoque de qualquer produto enviando uma mensagem no próprio WhatsApp da loja — sem precisar de nenhuma outra ferramenta.

**Para atualizar preço**, comece a mensagem com `#preços`:

> `#preços alcatra 54,90`

**Para atualizar estoque**, comece com `#estoque`:

> `#estoque alcatra 30 kg`

O sistema identifica o produto, atualiza o valor e confirma automaticamente. Não precisa de aprovação — a mudança entra na hora.

---

### Ensinar a assistente a responder uma dúvida nova

Toda vez que a assistente não souber responder algo — ou responder errado — **você mesmo pode ensinar a resposta certa pelo WhatsApp**, na hora.

Basta começar a mensagem com `#admin` e escrever a pergunta e a resposta:

> `#admin Qual o horário de funcionamento? Funcionamos de terça a sábado, das 8h às 18h.`

O sistema entende, verifica se já existe uma pergunta parecida na base, e atualiza ou cria o registro automaticamente. Na próxima vez que um cliente perguntar a mesma coisa, a assistente já sabe responder.

**Outros exemplos:**

> `#admin Vocês entregam no centro? Sim, entregamos no centro e bairros próximos.`
> `#admin Aceitam cartão? Aceitamos dinheiro, Pix e cartão de débito.`

**Dica:** comece ensinando as 10 perguntas que os clientes mais fazem hoje. Isso já cobre a maioria das situações e a assistente fica muito mais útil desde o primeiro dia.

---

## Cenários que podem acontecer no atendimento

### Cenário 1 — Cliente pergunta preço de produto que não está no catálogo

A assistente vai responder que não encontrou aquele produto. O cliente pode ficar confuso.

**O que fazer:** avisar o desenvolvedor para cadastrar o produto, ou pedir ao funcionário para adicionar via WhatsApp (se já estiver autorizado).

---

### Cenário 2 — Cliente manda mensagem e a assistente não responde

Pode ter acontecido uma desconexão técnica. O WhatsApp da loja precisa estar sempre conectado ao sistema.

**O que fazer:** avisar o desenvolvedor com a hora exata que aconteceu para ele verificar o que falhou.

---

### Cenário 3 — Cliente reclama que recebeu informação errada de preço

O preço no sistema está desatualizado.

**O que fazer:** atualizar o preço pelo WhatsApp (mandando a mensagem de preço) ou avisar o desenvolvedor para corrigir. Peça desculpas ao cliente e passe o preço correto diretamente.

---

### Cenário 4 — Cliente quer adicionar item depois de confirmar o pedido

A assistente já fechou o pedido. Depois da confirmação, ela não consegue editar mais.

**O que fazer:** atender o cliente diretamente no WhatsApp e combinar o item adicional fora do sistema — ou fazer um novo pedido separado.

---

### Cenário 5 — Cliente manda áudio e a assistente não entende

A assistente consegue transcrever e entender áudios na maioria dos casos. Se não entender, ela vai pedir para o cliente repetir por texto.

Isso é normal e esperado em alguns casos — sem precisar de ação sua.

---

### Cenário 6 — Cliente com pedido ativo manda nova mensagem

A assistente já sabe que ele tem pedido em andamento e conduz direto para o acompanhamento, sem recomeçar do zero.

---

### Cenário 7 — Funcionário manda mensagem de preço mas não tem resposta

O número dele não está cadastrado como autorizado, ou a mensagem não seguiu o formato esperado.

**O que fazer:** verificar com o desenvolvedor se o número está cadastrado. Pedir ao funcionário para mandar novamente no formato: *"preço [produto] [valor]"*.

---

### Cenário 8 — Cliente some depois que a IA transferiu para humano

A assistente parou de responder (correto), mas o atendente não viu a notificação a tempo.

**O que fazer:** entrar em contato com o cliente diretamente pelo WhatsApp da loja assim que perceber. Após resolver, avisar o desenvolvedor ou operador para reativar a assistente naquele cliente.

---

### Cenário 9 — Cliente retorna após entrega e manda nova mensagem

A assistente reconhece que ele já foi atendido e cumprimenta como cliente que voltou. Um novo atendimento começa do zero — histórico de compras é preservado internamente, mas a conversa não fica presa no passado.

---

### Cenário 10 — A assistente pergunta se o cliente quer mais alguma coisa e ele responde "não"

O pedido é fechado normalmente. Isso é intencional — evita o cliente ligar depois pedindo o que esqueceu de incluir.

---

## O que a assistente nunca vai fazer

Para evitar confusão, aqui está o que está fora do alcance dela:

- **Não cancela pedidos** — cancelamento precisa de um humano
- **Não edita pedido depois de confirmado** — o pedido gerado é o pedido final
- **Não negocia preço** — ela informa o preço do catálogo, sem descontos
- **Não promete prazos de entrega** — só informa as etapas conforme você avança
- **Não responde dúvidas que não foram ensinadas** — se não estiver na planilha, ela não sabe

---

## Resumo — o que é automático e o que é seu

| A assistente faz sozinha | Você faz |
|--------------------------|----------|
| Receber e responder clientes 24h | Separar e entregar pedidos |
| Identificar o que o cliente quer | Atender após handoff |
| Fechar pedidos completos | Atualizar preços quando mudar |
| Validar endereço de entrega | Treinar a assistente com novas dúvidas |
| Notificar cliente a cada etapa | Cadastrar ofertas e kits da semana |
| Reconhecer clientes antigos | Avisar o desenvolvedor quando algo falhar |
| Reengajar clientes que sumiram | — |
| Encaminhar para humano quando não sabe | — |
| Transcrever áudios de preço | — |

---

*Manual de Operação — Mercado Araujo*
*Para ajustes técnicos e configurações, contate o desenvolvedor responsável.*
