import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  Icon,
  INodeProperties,
} from 'n8n-workflow'

export class PixtexApi implements ICredentialType {
  name = 'pixtexApi'

  displayName = 'Pixtex API'

  documentationUrl = 'https://pixtex.dev/developers'

  icon: Icon = {
    light: 'file:../nodes/Pixtex/pixtex.svg',
    dark: 'file:../nodes/Pixtex/pixtex.dark.svg',
  }

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      required: true,
      default: '',
      description:
        'Your Pixtex API key (pxt_…). Get a free one at pixtex.dev/developers or with "npx pixtex signup you@example.com".',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.pixtex.dev',
      description: 'Only change this if you run your own Pixtex render API',
    },
  ]

  // The key travels in the Authorization header only — never in a URL.
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  }

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/v1/keys/me',
    },
  }
}
