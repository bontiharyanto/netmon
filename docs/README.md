# NETMON documentation

**Product:** [netmon.click](https://netmon.click)  
**Code:** one codebase for Cloud SaaS and on-premise  
**UI language:** English default, toggle **EN | ID** in the header  
**Default theme:** dark

Start here, then open the guide that matches the job.

| Document | Audience | Use it for |
| --- | --- | --- |
| [Local laptop](LOCAL.md) | Engineer | Run NETMON on `localhost:3000` |
| [Deployment](DEPLOYMENT.md) | Engineer | Cloud SaaS, on-premise, **shared VPS** |
| [Shared VPS edge](../deploy/EDGE.md) | Engineer | WorkPulse Caddy, port 3008, `netmon.click` |
| [Architecture](ARCHITECTURE.md) | Engineer | Stack, poller, tenancy |
| [RBAC](RBAC.md) | Admin | Roles and permissions |
| [User guide](USER-GUIDE.md) | NOC / customer | Daily console and portal |
| [Monitor devices](MONITORING.md) | Operator | Register devices, poller vs agent, configuration |
| [Database](DATABASE.md) | Engineer | Indexes, poller scan, metrics growth |
| [Ticketing](TICKETING.md) | Admin / NOC | Helpdesk, Jira, **NovaCRM** |
| [Channels](CHANNELS.md) | Admin | Email, Slack, WhatsApp, inbound replies |
| [AI](AI.md) | Admin | Rules vs local LLM vs cloud |
| [Agents](AGENT.md) | Operator | Inventory device → token → host heartbeat (not Add) |
| [API](API.md) | Engineer | Auth, webhooks, heartbeat |
| [Operations](OPERATIONS.md) | Engineer | Health, failures, Prisma |

Repo README stays the short product overview. This folder is the source of truth for how the current code behaves.
