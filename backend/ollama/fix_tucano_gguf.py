"""Corrige o GGUF do Tucano-2b4-Instruct para tokenizar `</instruction>` como texto.

No tokenizador original (Hugging Face), `<instruction>` é token especial (32000),
mas `</instruction>` é quebrado em pedaços comuns ("</", "in", "stru", "c", "tion", ">"):
foi assim que o modelo viu a tag no treino. O GGUF registra `</instruction>` como
token especial 32001, que o modelo nunca aprendeu, e a saída vira lixo (issue #19).

Renomear o token 32001 faz o llama.cpp/Ollama voltar a quebrar a tag em texto.
Só o vocabulário muda; pesos e demais metadados são copiados byte a byte.
"""
import sys
import gguf
from gguf.scripts.gguf_new_metadata import MetadataDetails, copy_with_new_metadata

src, dst = sys.argv[1], sys.argv[2]
reader = gguf.GGUFReader(src, "r")
arch = reader.get_field(gguf.Keys.General.ARCHITECTURE).contents()
tokens = reader.get_field(gguf.Keys.Tokenizer.LIST).contents()
assert tokens[32001] == "</instruction>", f"token 32001 inesperado: {tokens[32001]!r}"
tokens[32001] = "<|unused_32001|>"

writer = gguf.GGUFWriter(dst, arch=arch, endianess=reader.endianess)
copy_with_new_metadata(reader, writer, {
    gguf.Keys.Tokenizer.LIST: MetadataDetails(gguf.GGUFValueType.ARRAY, tokens, sub_type=gguf.GGUFValueType.STRING),
}, [])
