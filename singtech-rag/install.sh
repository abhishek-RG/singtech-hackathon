#!/usr/bin/env bash
set -euo pipefail
cd ~/singtech-rag
echo "[ollama] download $(date)"
curl -fsSL -o /tmp/ollama.tar.zst https://ollama.com/download/ollama-linux-amd64.tar.zst
tar --zstd -xf /tmp/ollama.tar.zst -C ~/.local/ollama && rm /tmp/ollama.tar.zst
~/.local/ollama/bin/ollama --version || true
echo "[jev] download $(date)"
cd ~/singtech-rag/bin
base=https://github.com/feder-cr/jev/releases/download/jevos-v5
curl -fsSL -O $base/SHA256SUMS.txt -O $base/jev-linux-x64.tar.gz -O $base/jevos-v5-openvino-int8.zip
grep -E "jev-linux-x64.tar.gz|jevos-v5-openvino-int8.zip" SHA256SUMS.txt | sha256sum -c -
tar -xzf jev-linux-x64.tar.gz && unzip -oq jevos-v5-openvino-int8.zip -d ../models && rm jev-linux-x64.tar.gz jevos-v5-openvino-int8.zip
ls -la ~/singtech-rag/bin ~/singtech-rag/models | head -30
echo "[done] $(date)"
