import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import $ from "jquery";

import Constants from "./constants";
import "./App.css";

function App() {
  const [ciphertext, setCiphertext] = useState("No Text");
  const [mode, setMode] = useState("AES");
  const [operation, setOperation] = useState("encrypt");
  const [throughput, setThroughput] = useState(false);
  const [latency, setLatency] = useState(false);

  // Testing Parameters
  const iteration = 1000;
  const dataSize = mode === "AES" ? 16 : 64; //change this to 10MB = 1024 * 1024 * 10

  const { register, handleSubmit } = useForm();
  const onSubmit = (data) => {
    if (data.plaintext) {
      let plaintext = data.plaintext;
      let uri =
        mode === "AES" ? Constants.flaskServer : Constants.expressServer;
      let route = operation === "encrypt" ? "encrypt" : "decrypt";

      let dataBody = {
        plaintext: plaintext,
      };

      callAlgorithm(`${uri}/${route}`, JSON.stringify(dataBody), (data) => {
        setCiphertext(data.ciphertext);
      });
    }
  };

  const callAlgorithm = (uri, data, callback = () => {}) => {
    $.ajax({
      url: uri,
      method: "POST",
      contentType: "application/json",
      data: data,
      success: function (data) {
        callback(data);
      },
      error: function (xhr, status, error) {
        console.log(error);
      },
    });
  };

  const getRandomAsciiString = (length = 16) => {
    const chars = [];
    for (let i = 0x20; i <= 0x7e; i++) {
      chars.push(String.fromCharCode(i));
    }

    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    return Array.from(array, (byte) => chars[byte % chars.length]).join("");
  };

  const getThroughput = (mode) => {
    let timings = {
      encStart: null,
      encEnd: null,
      deeStart: null,
      deeEnd: null,
    };

    let uri = mode === "AES" ? Constants.flaskServer : Constants.expressServer;
    let encBody = {
      plaintext: getRandomAsciiString(dataSize),
    };

    timings.encStart = performance.now();

    callAlgorithm(`${uri}/encrypt`, JSON.stringify(encBody), (data) => {
      timings.encEnd = performance.now();
      timings.deeStart = performance.now();
      let deeBody = {
        plaintext: data.ciphertext,
      };
      callAlgorithm(`${uri}/decrypt`, JSON.stringify(deeBody), (data) => {
        timings.deeEnd = performance.now();
        let throughputTiming = {
          enc: null,
          dee: null,
          total: null,
        };

        let throughputVal = {
          enc: null,
          dee: null,
          total: null,
        };

        throughputTiming.enc = (timings.encEnd - timings.encStart) / 1000;
        throughputTiming.dee = (timings.deeEnd - timings.deeStart) / 1000;
        throughputTiming.total = (timings.deeEnd - timings.encStart) / 1000;

        throughputVal.enc = dataSize / 1024 / 1024 / throughputTiming.enc;
        throughputVal.dee = dataSize / 1024 / 1024 / throughputTiming.dee;
        throughputVal.total = dataSize / 1024 / 1024 / throughputTiming.total;

        setThroughput(throughputVal);
        console.log(throughputTiming, throughputVal);
      });
    });
  };

  const getLatency = (mode) => {
    let totalTime = {
      enc: 0,
      dee: 0,
      total: 0,
    };
    let uri = mode === "AES" ? Constants.flaskServer : Constants.expressServer;

    for (let i = 0; i < iteration; i++) {
      let timings = {
        encStart: null,
        encEnd: null,
        deeStart: null,
        deeEnd: null,
      };

      let encBody = {
        plaintext: getRandomAsciiString(dataSize),
      };
      timings.encStart = performance.now();
      callAlgorithm(`${uri}/encrypt`, JSON.stringify(encBody), (data) => {
        timings.encEnd = performance.now();
        timings.deeStart = performance.now();
        let deeBody = {
          plaintext: data.ciphertext,
        };
        callAlgorithm(`${uri}/decrypt`, JSON.stringify(deeBody), (data) => {
          timings.deeEnd = performance.now();

          totalTime.enc += timings.encEnd - timings.encStart;
          totalTime.dee += timings.deeEnd - timings.deeStart;
          totalTime.total += timings.deeEnd - timings.encStart;

          if (i == iteration - 1) {
            let latencyVal = {
              enc: null,
              dee: null,
              total: null,
            };

            latencyVal.enc = totalTime.enc / iteration;
            latencyVal.dee = totalTime.dee / iteration;
            latencyVal.total = totalTime.total / iteration;

            setLatency(latencyVal);
          }
        });
      });
    }
  };

  useEffect(() => {
    $(".multiButtonOperation .button").on("click", function () {
      if (!$(this).hasClass("active")) {
        $(".multiButtonOperation .button").removeClass("active");
        $(this).addClass("active");
        setOperation(this.id);
      }
    });
    $(".multiButtonMode .button").on("click", function () {
      if (!$(this).hasClass("active")) {
        $(".multiButtonMode .button").removeClass("active");
        $(this).addClass("active");
        setMode(this.id);
        setThroughput(false);
        setLatency(false);
      }
    });

    return () => {
      $(".multiButtonOperation .button").off("click");
      $(".multiButtonMode .button").off("click");
    };
  }, []);

  useEffect(() => {
    $(".testButton").on("click", function () {
      console.log("click");
      switch (this.id) {
        case "throughput":
          console.log(mode);
          getThroughput(mode);
          break;
        case "latency":
          console.log("latency");
          getLatency(mode);
          break;
        default:
          console.log("default");
      }
    });

    return () => {
      $(".testButton").off("click");
    };
  }, [mode]);

  return (
    <div className="app">
      <div className="cell plaintext">
        <div className="head1">
          Comparative Study of AES-128 and ChaCha20-Poly1305
        </div>
        <div className="centerCard">
          <form
            onSubmit={handleSubmit((data) => {
              onSubmit(data);
            })}>
            <div className="multiButton multiButtonOperation">
              <div id="encrypt" className="button encrypt active">
                Encrypt
              </div>
              <div id="decrypt" className="button decrypt">
                Decrypt
              </div>
            </div>
            <div className="label">
              {operation === "encrypt" ? "Plaintext" : "Ciphertext"}
            </div>
            <input
              {...register("plaintext", { required: true, minLength: 2 })}
            />
            <div className="multiButton multiButtonMode">
              <div id="AES" className="button AES active">
                AES-128
              </div>
              <div id="ChaCha" className="button ChaCha">
                ChaCha20-Poly1305
              </div>
            </div>
            <input
              type="submit"
              value={operation === "encrypt" ? "Encrypt" : "Decrypt"}
            />
          </form>
        </div>
      </div>
      <div className="cell ciphertext">
        <div className="centerCard cipherBlock">
          <div className="ciphertextBlock">
            <div className="label">
              {operation === "encrypt" ? "Ciphertext" : "Plaintext"}
            </div>
            <div className="ciphertextOutput">{ciphertext}</div>
          </div>
        </div>
        <div className="testingBlock">
          <div className="testingHead">
            Testing for {mode === "AES" ? "AES-128" : null}
            {mode === "ChaCha" ? "ChaCha20-Poly1305" : null}
          </div>
          <div className="testingGrid">
            <div className="parameter">
              <div className="label">Throughput</div>
              {throughput && (
                <div className="subGrid">
                  <div>
                    {/* make the fixed value to 2 */}
                    <div className="label">Encryption</div>
                    <div className="valueBlock">
                      <div className="value">{throughput.enc.toFixed(4)}</div>{" "}
                      MB/s
                    </div>
                  </div>
                  <div>
                    <div className="label">Decryption</div>
                    <div className="valueBlock">
                      <div className="value">{throughput.dee.toFixed(4)}</div>{" "}
                      MB/s
                    </div>
                  </div>
                  <div>
                    <div className="label">Total</div>
                    <div className="valueBlock">
                      <div className="value">{throughput.total.toFixed(4)}</div>{" "}
                      MB/s
                    </div>
                  </div>
                </div>
              )}
              <div id="throughput" className="testButton">
                Test
              </div>
            </div>
            <div className="parameter">
              <div className="label">Latency (Average)</div>
              {latency && (
                <div className="subGrid">
                  <div>
                    {/* make the fixed value to 2 */}
                    <div className="label">Encryption</div>
                    <div className="valueBlock">
                      <div className="value">{latency.enc.toFixed(4)}</div> ms
                    </div>
                  </div>
                  <div>
                    <div className="label">Decryption</div>
                    <div className="valueBlock">
                      <div className="value">{latency.dee.toFixed(4)}</div> ms
                    </div>
                  </div>
                  <div>
                    <div className="label">Total</div>
                    <div className="valueBlock">
                      <div className="value">{latency.total.toFixed(4)}</div> ms
                    </div>
                  </div>
                </div>
              )}
              <div id="latency" className="testButton">
                Test
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
