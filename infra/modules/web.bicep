@description('The name of the Static Web App')
param name string

@description('The location of the Static Web App')
param location string

@description('The tags to apply to the Static Web App')
param tags object = {}

@description('The GitHub repository URL')
param repositoryUrl string

@description('The GitHub branch')
param branch string = 'main'

@description('The app location in the repository')
param appLocation string = '/'

@description('The output location for the build')
param outputLocation string = 'dist'

@description('The build command')
param buildCommand string = 'npm run build'

resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    buildProperties: {
      appLocation: appLocation
      outputLocation: outputLocation
      appBuildCommand: buildCommand
    }
  }
}

output uri string = 'https://${staticWebApp.properties.defaultHostname}'
output deploymentToken string = staticWebApp.listSecrets().properties.apiKey