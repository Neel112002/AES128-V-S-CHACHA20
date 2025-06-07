import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import $ from "jquery";

import Constants from "./constants";
import "./App.css";

function App() {
  const [plaintext, setPlaintext] = useState("Hello World");
  const [ciphertext, setCiphertext] = useState(
    "Press Encrpyt/Decrypt to see the output."
  );
  const [mode, setMode] = useState("AES");
  const [operation, setOperation] = useState("encrypt");
  const [throughput, setThroughput] = useState(false);
  const [latency, setLatency] = useState(false);
  const [avalanche, setAvalanche] = useState(false);
  const [authRes, setAuthRes] = useState(false);
  const [sideSen, setSideSen] = useState(false);

  // Testing Parameters
  const iteration = 1000;
  const dataSize = 50;
  const dataPerBlock = mode === "AES" ? 16 : 64;

  const { register, handleSubmit } = useForm();
  const onSubmit = (data) => {
    if (plaintext) {
      // console.log(data.plaintext)
      // let plaintext = plaintext;
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

  const handleInput = (e) => {
    setPlaintext(e.target.value);
  };

  function stats(times) {
    const n = times.length;
    const mean = times.reduce((a, b) => a + b, 0) / n;
    const sq = times.reduce((a, b) => a + (b - mean) ** 2, 0);
    const stddev = Math.sqrt(sq / (n - 1));
    return { mean, stddev };
  }

  const callAlgorithm = (
    uri,
    data,
    callback = () => {},
    errorCB = () => {}
  ) => {
    $.ajax({
      url: uri,
      method: "POST",
      contentType: "application/json",
      data: data,
      success: function (data) {
        callback(data);
      },
      error: function (xhr, status, error) {
        errorCB(xhr, status, error);
        console.log(error);
      },
    });
  };

  const getRandomAsciiString = (sizeInBytes = 16) => {
    const MAX_CHUNK = 65536; // Max allowed by crypto.getRandomValues
    const printableAscii = [];
    for (let i = 0x20; i <= 0x7e; i++) {
      printableAscii.push(String.fromCharCode(i));
    }

    const result = [];

    for (let i = 0; i < sizeInBytes; i += MAX_CHUNK) {
      const chunkSize = Math.min(MAX_CHUNK, sizeInBytes - i);
      const byteChunk = new Uint8Array(chunkSize);
      crypto.getRandomValues(byteChunk);
      for (let j = 0; j < chunkSize; j++) {
        const char = printableAscii[byteChunk[j] % printableAscii.length];
        result.push(char);
      }
    }

    return result.join("");
  };

  function countBitDifferencePercentage(str1, str2) {
    let differingBits = 0;
    let differingChar = 0;
    const totalBits = str1.length * 8;
    const totalChar = str1.length;
    for (let i = 0; i < str1.length; i++) {
      const charCode1 = str1.charCodeAt(i);
      const charCode2 = str2.charCodeAt(i);
      const xor = charCode1 ^ charCode2;
      differingBits += xor.toString(2).split("1").length - 1;

      const char1 = str1.charAt(i);
      const char2 = str2.charAt(i);
      if (char1 !== char2) {
        differingChar += 1;
      }
    }
    return {
      bitWise: (differingBits / totalBits) * 100,
      charWise: (differingChar / totalChar) * 100,
    };
  }

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
        plaintext: getRandomAsciiString(dataPerBlock),
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

  const getAvalanche = (mode, trials = iteration) => {
    let uri = mode === "AES" ? Constants.flaskServer : Constants.expressServer;
    let totalPercentageBits = 0;
    let totalPercentageChar = 0;

    for (let i = 0; i < trials; i++) {
      let orgData = getRandomAsciiString(dataPerBlock);
      let orgDataBody = {
        plaintext: orgData,
      };
      callAlgorithm(`${uri}/encrypt`, JSON.stringify(orgDataBody), (data) => {
        let orgEncData = data.ciphertext;
        let modData = [...orgData];
        modData[0] ^= 0b00000001;
        let modDataBody = {
          plaintext: modData.join(""),
        };
        callAlgorithm(`${uri}/encrypt`, JSON.stringify(modDataBody), (data) => {
          let modEncData = data.ciphertext;
          let bitDiff = countBitDifferencePercentage(
            orgEncData.split("|")[1],
            modEncData.split("|")[1]
          );
          totalPercentageBits += bitDiff.bitWise;
          totalPercentageChar += bitDiff.charWise;
          setAvalanche({
            bitWise: totalPercentageBits / trials,
            charWise: totalPercentageChar / trials,
          });
        });
      });
    }
  };

  const getAuthRes = (mode) => {
    let data = getRandomAsciiString(dataPerBlock);
    let uri = mode === "AES" ? Constants.flaskServer : Constants.expressServer;
    let encBody = {
      plaintext: data,
    };
    let authResTest = {
      tagTamp: false,
      ctTamp: false,
    };
    callAlgorithm(`${uri}/encrypt`, JSON.stringify(encBody), (data) => {
      let cipher = data.ciphertext.split("|");
      console.log(cipher);

      const forgedTag = cipher[2].split("");
      forgedTag[0] ^= 0x01; // Flip bit
      cipher[2] = forgedTag.join("");
      console.log(cipher, forgedTag);
      let deeBody1 = {
        plaintext: cipher.join("|"),
      };

      callAlgorithm(
        `${uri}/decrypt`,
        JSON.stringify(deeBody1),
        (data) => {
          console.log("Forged tag was accepted (authentication failed)");
        },
        (xhr, status, error) => {
          console.log("Forged tag was correctly rejected");
          authResTest.tagTamp = true;
          setAuthRes(authResTest);
        }
      );

      const forgedCT = cipher[1].split("");
      forgedCT[0] ^= 0x01; // Flip bit
      cipher[1] = forgedCT.join("");
      console.log(cipher, forgedCT);
      let deeBody2 = {
        plaintext: cipher.join("|"),
      };
      callAlgorithm(
        `${uri}/decrypt`,
        JSON.stringify(deeBody2),
        (data) => {
          console.log("Forged ciphertext was accepted (authentication failed)");
        },
        (xhr, status, error) => {
          console.log("Forged ciphertext was correctly rejected");
          authResTest.ctTamp = true;
          setAuthRes(authResTest);
        }
      );
    });
  };

  const getSideSen = (mode, trails = iteration) => {
    let uri = mode === "AES" ? Constants.flaskServer : Constants.expressServer;
    let times = [];

    for (let i = 0; i < trails; i++) {
      let data = getRandomAsciiString(dataPerBlock);
      let encBody = {
        plaintext: data,
      };
      const t0 = performance.now();
      callAlgorithm(`${uri}/encrypt`, JSON.stringify(encBody), (data) => {
        const t1 = performance.now();
        times.push(t1 - t0);
        if (i === trails - 1) {
          let enStat = stats(times);
          setSideSen({
            mean: enStat.mean.toFixed(4),
            std: enStat.stddev.toFixed(4),
          });
        }
      });
    }
  };

  useEffect(() => {
    $(".multiButtonOperation .button").on("click", function () {
      if (!$(this).hasClass("active")) {
        $(".multiButtonOperation .button").removeClass("active");
        $(this).addClass("active");
        setOperation(this.id);
        if (this.id === "decrypt") {
          if (ciphertext === "Press Encrpyt/Decrypt to see the output.") {
            setPlaintext("");
          } else {
            setPlaintext(ciphertext);
          }
          setCiphertext("Press Encrpyt/Decrypt to see the output.");
        } else {
          setPlaintext("");
          setCiphertext("Press Encrpyt/Decrypt to see the output.");
        }
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
  }, [ciphertext]);

  useEffect(() => {
    $(".testButton").on("click", function () {
      console.log("click");
      switch (this.id) {
        case "throughput":
          getThroughput(mode);
          break;
        case "latency":
          getLatency(mode);
          break;
        case "avalanche":
          getAvalanche(mode, iteration);
          break;
        case "authRes":
          getAuthRes(mode);
          break;
        case "sideSen":
          getSideSen(mode, iteration);
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
            <textarea
              {...register("plaintext", { required: true, minLength: 2 })}
              value={plaintext}
              onChange={handleInput}
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
            <div className="parameter throughput">
              <div className="label">Throughput</div>
              {throughput && (
                <div className="subGrid">
                  <div>
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
            <div className="parameter latency">
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
            <div className="parameter avalanche">
              <div className="label">Avalanche Effect (Average)</div>
              {avalanche && (
                <div className="subGrid">
                  <div>
                    <div className="label">Bit-Wise</div>
                    <div className="valueBlock">
                      <div className="value">
                        {avalanche.bitWise.toFixed(2)}
                      </div>{" "}
                      %
                    </div>
                  </div>
                  <div>
                    <div className="label">Character-Wise</div>
                    <div className="valueBlock">
                      <div className="value">
                        {avalanche.charWise.toFixed(2)}
                      </div>{" "}
                      %
                    </div>
                  </div>
                </div>
              )}
              <div id="avalanche" className="testButton">
                Test
              </div>
            </div>
            <div className="parameter authRes">
              <div className="label">Authentication Resistance</div>
              {authRes && (
                <div className="subGrid">
                  <div>
                    <div className="label">Tap Tampering</div>
                    <div className="valueBlock">
                      <div className="value">
                        {authRes.tagTamp ? "Passed" : "Failed"}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="label">Ciphertext Tampering</div>
                    <div className="valueBlock">
                      <div className="value">
                        {authRes.ctTamp ? "Passed" : "Failed"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div id="authRes" className="testButton">
                Test
              </div>
            </div>
            <div className="parameter sideSen">
              <div className="label">
                Side-Channel Sensitivity - Timing Harness
              </div>
              {sideSen && (
                <div className="subGrid">
                  <div>
                    <div className="label">Mean</div>
                    <div className="valueBlock">
                      <div className="value">{sideSen.mean} ms</div>
                    </div>
                  </div>
                  <div>
                    <div className="label">Standard Deviation</div>
                    <div className="valueBlock">
                      <div className="value">{sideSen.std} ms</div>
                    </div>
                  </div>
                </div>
              )}
              <div id="sideSen" className="testButton">
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
