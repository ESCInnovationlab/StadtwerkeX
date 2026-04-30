# Azure Setup Guide for EnergyBot

To host EnergyBot on Azure with CI/CD from GitHub, follow these steps.

## 1. Create Azure Resources

You can do this via the [Azure Portal](https://portal.azure.com):

1.  **Resource Group**: Create a new resource group (e.g., `rg-energybot-prod`).
2.  **Azure Container Registry (ACR)**: 
    - Create a registry (e.g., `energybotregistry`).
    - Enable **Admin user** in the Access Keys tab (needed for GitHub login).
3.  **Azure Storage Account**:
    - Create a storage account.
    - Create a **File Share** (e.g., `excel-data`).
    - Upload your `Hausanschluss_data.xlsx` and other geojson files here.
4.  **Azure Key Vault**:
    - Create a Key Vault (e.g., `kv-energybot`).
    - Add secrets: `LLM-API-KEY`, `APP-PASSWORD`, `APP-USERNAME`.
5.  **Azure Container App** (Recommended):
    - Create a Container App environment.
    - Create two Container Apps: `energybot-backend` and `energybot-frontend`.
    - Mount the Azure File Share to the backend container at `/app/excel_data`.

## 2. GitHub Secrets Setup

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add the following **Repository Secrets**:

| Secret Name | Value |
| :--- | :--- |
| `AZURE_CREDENTIALS` | The JSON output from the command below |
| `ACR_NAME` | Your ACR name (e.g., `energybotregistry`) |
| `RESOURCE_GROUP` | Your Resource Group name |
| `CONTAINER_APP_NAME` | The name of your backend container app |

### How to get `AZURE_CREDENTIALS`
Run this in your local terminal (after installing Azure CLI):
```bash
az ad sp create-for-rbac --name "github-actions-sp" --sdk-auth --role contributor --scopes /subscriptions/<YOUR_SUBSCRIPTION_ID>/resourceGroups/<YOUR_RESOURCE_GROUP>
```
Copy the resulting JSON and paste it into the `AZURE_CREDENTIALS` secret.

## 3. GDPR Compliance Note
- The `excel_data` folder is **not** pushed to Git.
- Azure Storage encrypts data at rest.
- Ensure your Azure Region is set to **Germany West Central** (Frankfurt) or **Germany North** to keep data within Germany.
