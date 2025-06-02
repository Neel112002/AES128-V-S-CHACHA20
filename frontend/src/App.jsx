// App.jsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import $ from "jquery";

import Constants from "./constants";
import "./App.css";

function App() {
  const [plaintext, setPlaintext] = useState("");
  const [ciphertext, setCiphertext] = useState("No Text");
  const [mode, setMode] = useState("AES");
  const [operation, setOperation] = useState("encrypt");

  const { register, handleSubmit } = useForm();
  const onSubmit = (data) => {
    if (data.plaintext) {
      let plaintext = data.plaintext;
      let uri = mode === "AES" ? Constants.flaskServer : Constants.expressServer;
      let route = operation === "encrypt" ? "encrypt" : "decrypt";

      let dataBody = {
        plaintext: plaintext,
      };

      $.ajax({
        url: `${uri}/${route}`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(dataBody),
        success: function (data) {
          setCiphertext(data.ciphertext);
        },
        error: function (xhr, status, error) {
          console.log(error);
        },
      });
    }
  };

  useEffect(() => {
    $(".multiButton .button").on("click", function () {
      if (!$(this).hasClass("active")) {
        $(this).siblings().removeClass("active");
        $(this).addClass("active");
        if (this.id === "AES" || this.id === "ChaCha") {
          setMode(this.id);
        } else {
          setOperation(this.id);
        }
      }
    });

    return () => {
      $(".multiButton .button").off("click");
    };
  }, []);

  return (
    <div className="app">
      <div className="cell plaintext">
        <div className="head1">
          Comparative Study of AES-128 and ChaCha20-Poly1305
        </div>
        <div className="centerCard">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="label">Plaintext</div>
            <input
              {...register("plaintext", { required: true, maxLength: 50 })}
            />
            <div className="multiButton">
              <div id="AES" className="button AES active">
                AES-128
              </div>
              <div id="ChaCha" className="button ChaCha">
                ChaCha20-Poly1305
              </div>
            </div>
            <div className="multiButton">
              <div id="encrypt" className="button encrypt active">
                Encrypt
              </div>
              <div id="decrypt" className="button decrypt">
                Decrypt
              </div>
            </div>
            <input type="submit" value={operation === "encrypt" ? "Encrypt" : "Decrypt"} />
          </form>
        </div>
      </div>
      <div className="cell ciphertext">
        <div className="centerCard">
          <div className="label">
            {operation === "encrypt" ? "Ciphertext" : "Decrypted Text"}
          </div>
          <div className="ciphertextOutput">{ciphertext}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
