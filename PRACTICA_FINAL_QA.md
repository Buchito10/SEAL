# Práctica Final de Deployment y QA — SEAL

## Documentos principales

- [Guía completa de servidor, dominio, HTTPS y pruebas](docs/release/GUIA_PRACTICA_FINAL_SEAL.md)
- [Directiva de liberación, SemVer, rollback y privacidad](docs/release/DIRECTIVA_LIBERACION_SEAL.md)
- [Resultados de las pruebas locales](docs/release/RESULTADOS_QA_LOCAL.md)
- [Resultados de las pruebas en producción](docs/release/RESULTADOS_QA_PRODUCCION.md)
- [Documento PDF de release](output/pdf/SEAL_Release_Deployment_QA.pdf)
- [Guion del video de cinco minutos](docs/release/GUION_VIDEO_5_MINUTOS.md)

## Comandos de comprobación local

```bash
npm --prefix Back run test:coverage
npm --prefix qa run test:e2e
docker compose -f compose.local.yaml ps
```

## Comando final contra el sitio Cloud

```bash
BASE_URL=https://seal.westus2.cloudapp.azure.com ./qa/scripts/run-cloud-qa.sh
```

## Scripts del VPS

```bash
sudo ./deploy/cloud/bootstrap-ubuntu.sh
./deploy/cloud/deploy-release.sh v1.0.0-release
./deploy/cloud/verify-production.sh seal.westus2.cloudapp.azure.com
./deploy/cloud/rollback.sh
```

Los reportes definitivos se producen después de configurar el servidor público y quedan en `Back/coverage` y `qa/reports`.
