targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Name of the resource group')
param resourceGroupName string = ''

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

// Organize resources in a resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: !empty(resourceGroupName) ? resourceGroupName : '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

// Create the Static Web App
module web './modules/web.bicep' = {
  name: 'web'
  scope: rg
  params: {
    name: '${abbrs.webStaticSites}web-${resourceToken}'
    location: location
    tags: tags
    repositoryUrl: 'https://github.com/YOUR_USERNAME/pleasant-knoll-clock-in'
    branch: 'main'
    appLocation: '/'
    outputLocation: 'dist'
    buildCommand: 'npm run build'
  }
}

// Output the Static Web App URL
output AZURE_STATIC_WEB_APPS_URL string = web.outputs.uri
output AZURE_STATIC_WEB_APPS_API_TOKEN string = web.outputs.deploymentToken