# Security policy

USDPAY welcomes responsible disclosure of security vulnerabilities affecting its public API, hosted checkout, dashboard or integration examples.

## Reporting a vulnerability

Email **support@usdpay.me** with the subject `Security report`.

Include, when possible:

- the affected URL or API operation;
- a clear description of the issue and its impact;
- reproducible steps or a minimal proof of concept;
- whether any real merchant or customer data may be affected;
- your preferred contact details.

Do not open a public GitHub issue for a vulnerability. Do not access, change, retain or disclose data belonging to another person, and do not disrupt the availability of the service while testing.

We will acknowledge a valid report, investigate it and coordinate remediation and disclosure with the reporter when appropriate.

## Secrets

Never commit USDPAY API keys, webhook secrets, wallet private keys, seed phrases or production customer data. If an API key or webhook secret is exposed, rotate it immediately in the merchant dashboard.
