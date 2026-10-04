# Pantry recipe generation

In Recipes → Add recipe, choose **Come up with something** to request three ideas.
Preview the ingredients and steps, generate another set, or use an idea to fill the
editable recipe form. Only **Save recipe** adds it to the cookbook. Generating and
saving recipes never consume pantry inventory. Available in mobile and the web prototype.

## Backend setup

The implementation uses Amazon Nova Micro through
the [Bedrock Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html).
Set these environment variables on the Spring Boot process, then restart it:

| Variable | Value |
| --- | --- |
| `AWS_BEARER_TOKEN_BEDROCK` | A Bedrock API key with permission to invoke the configured model |
| `AWS_REGION` | Defaults to `us-east-1` |
| `CABINATE_RECIPE_MODEL` | Defaults to `amazon.nova-micro-v1:0` |

If you previously set the Claude model override, replace it in the PowerShell
window that starts the backend, then restart the backend:

```powershell
$env:CABINATE_RECIPE_MODEL = "amazon.nova-micro-v1:0"
mvn.cmd spring-boot:run
```

Run Maven from the `api` directory. The existing Bedrock token and region settings
still apply. No Anthropic first-time use form is needed for Amazon Nova Micro.
The tool schema uses Nova's supported root fields (`type`, `properties`, `required`)
and automatic tool selection, following the
[Nova tool documentation](https://docs.aws.amazon.com/nova/latest/userguide/tool-use-definition.html).
Regeneration supplies previously suggested titles to request different dishes.
Partial model responses are collected across at most five calls, with collected
titles excluded from subsequent calls. Extra suggestions are limited to three.
Temperature `0.4` allows variation; explicit exclusions prevent repeated titles.
Short inventory identifiers with an allowed-value schema prevent confusion between
similar database IDs. Common unavailable staples mentioned in recipe text are
rejected and replaced. This guard is not an exhaustive semantic ingredient check.

Create a key using the [AWS instructions](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html).
Keep it in the backend environment or secret manager, never source control or an
`EXPO_PUBLIC_*` variable. This adapter supports Bedrock bearer keys; IAM role/SigV4
authentication is not implemented. Model access and region availability must be
enabled in your AWS account. Missing configuration produces a user-friendly 503 error;
configuration details remain in server logs rather than being displayed in the app.
there are no canned recipes presented as generated results.

## API and behavior

`POST /api/v1/recipes/generate` accepts `{"excludeTitles": []}` (up to 60 titles,
120 characters each). It returns exactly three objects with `title`, `description`,
`ingredients` (display strings), `steps`, `prepTimeMinutes`, `cookTimeMinutes`, and
`servings`. The endpoint reads the same pantry as existing pantry APIs. This repository
currently has a shared pantry and no user authentication; account scoping must be
added with authentication before a multi-user deployment.

The service sends at most 100 available pantry items, earliest expiration first,
to Bedrock. Zero/negative quantities and dates before the server's current date are
excluded. Pantry names, quantities, units and expiration dates are sent to the provider.
The AI proposes ingredient IDs and amounts; the server validates them against stock
and constructs ingredient labels from actual pantry names. Each recipe independently
fits the inventory. Water is the only freely assumed ingredient. Cooking directions
remain AI-authored and should be reviewed; ingredient-list validation cannot prove
the semantic correctness of every instruction.

Regeneration sends the last 60 suggestion titles and rejects repeated normalized
titles. The prompt also requests different dishes and methods; semantic novelty is
not mathematically guaranteed. If three valid ideas cannot be produced, the API
returns an error and the UI keeps the previous set and draft. Empty stock returns
422; invalid output returns 502; unavailable provider returns 503; more than two
simultaneous generations per API instance returns 429. Provider calls time out after
10 seconds each. Failed calls are never automatically retried; successful partial
responses may trigger a request for the remaining suggestions. Client deadlines are 65 seconds.
The concurrency cap is not a per-account spending quota; add authenticated rate
limits before public deployment.

## Verification

Run `mvn test` in `api`, `npm run typecheck` and `npm test` in `mobile`, and
`npm run build` in `web`. Provider tests use a stub transport without paid requests.
For a live check, configure the backend, add pantry ingredients, generate a set,
regenerate, select a suggestion, edit it, and save. Verify the saved recipe and that
pantry quantities are unchanged. Also check an empty pantry and an unavailable provider.
