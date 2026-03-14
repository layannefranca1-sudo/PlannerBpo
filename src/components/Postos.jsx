import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient"; // arquivo de conexão com Supabase

export default function Postos() {
  const [postos, setPostos] = useState([]);
  const [nomePosto, setNomePosto] = useState("");

  // Carrega os postos quando o componente abrir
  useEffect(() => {
    carregarPostos();
  }, []);

  const carregarPostos = async () => {
    const { data, error } = await supabase.from("postos").select("*");
    if (error) console.log(error);
    else setPostos(data);
  };

  const adicionarPosto = async () => {
    if (!nomePosto) return alert("Informe o nome do posto");

    const { data, error } = await supabase
      .from("postos")
      .insert([{ nome: nomePosto }]);

    if (error) console.log(error);
    else {
      setNomePosto("");
      carregarPostos();
    }
  };

  const excluirPosto = async (id) => {
    const { error } = await supabase.from("postos").delete().eq("id", id);
    if (error) console.log(error);
    else carregarPostos();
  };

  return (
    <div>
      <h2>Cadastro de Postos</h2>
      <input
        type="text"
        placeholder="Nome do posto"
        value={nomePosto}
        onChange={(e) => setNomePosto(e.target.value)}
      />
      <button onClick={adicionarPosto}>Adicionar</button>

      <ul>
        {postos.map((posto) => (
          <li key={posto.id}>
            {posto.nome}{" "}
            <button onClick={() => excluirPosto(posto.id)}>Excluir</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

