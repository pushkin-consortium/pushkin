/**
 * React Static Boilerplate
 * https://github.com/kriasoft/react-static-boilerplate
 *
 * Copyright © 2015-present Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
/* eslint-disable max-len */

import * as f from "react-foundation";
import { Row, Col, Image } from "react-bootstrap";
import React, { PropTypes } from "react";
import s from "./styles.css";
import { Link } from "react-router";

class Archive extends React.Component {
  render() {
    if (!this.props.children) {
      return (
        <div>
          <Image
            style={{ display: "none" }}
            src={require("../../img/favicon.ico")}
          />
          <div>
            <Row>
              <Col xs={12}>
                <div className={s.blurb}>
                  <p className={s.sub}>
                    The experiments on this list are closed.{" "}
                    <b style={{ color: "red" }}>
                      No new data will be collected
                    </b>. However, you can run through any of them that you
                    wish. You may find this useful in understanding the results
                    reported for any of these experiments, or you may find it
                    simply entertaining.
                  </p>
                  <hr />

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/MRQ/index.html"
                    >
                      Mind Reading Quotient
                    </a>
                    <br />Forget psychics, all of us have to read minds. We try
                    to figure out what people are thinking based on what they
                    say or do. <strong>See your results at the end.</strong>
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/IgnoreThat/index.html"
                    >
                      Ignore That!
                    </a>
                    <br />How distractable are you? How well can you ignore
                    irrelevant information?{" "}
                    <strong>See your results at the end.</strong>
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/TrialsoftheHeart/index.html"
                    >
                      Trials of the Heart
                    </a>
                    <br />In the future, you won&apos;t be allowed to cause
                    other people to have emotions. See what this future is like,
                    and help researchers better understand human emotion &amp;
                    language. <strong>In English and/or Korean.</strong>
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/WhiteBear/index.html"
                    >
                      Rapid Reading (White Bear)
                    </a>
                    <br />(originally hosted by the Visual Cognition Online Lab
                    at Harvard; ~3 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/Actions"
                    >
                      The Meaning of Actions: Our Bodies, Our Minds
                    </a>
                    <br />(3-5 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/English/index.html"
                    >
                      How the Brain Reads
                    </a>
                    <br />(10 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/LetterSense"
                    >
                      Letter Sense
                    </a>
                    <br />(3-5 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/LetterSense2"
                    >
                      Letter Sense II
                    </a>
                    <br />(5 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/BirthOrder/index.html"
                    >
                      The Birth Order Survey
                    </a>
                    <br />(5 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/WordSense/index.html"
                    >
                      Word Sense
                    </a>
                    <br />(5 minutes; see your results at end) Can you figure
                    out what a word means by how it sounds?
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/Learning/index.html"
                    >
                      Learning the Names of Things
                    </a>
                    <br />(5 minutes; see your results at end). Can you learn
                    words the way children do?
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/DaxStory"
                    >
                      Find the Dax
                    </a>
                    <br />(5 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/Sliktopoz"
                    >
                      Угадай кто сликтопоз
                    </a>
                    <br />(5 minutes; Find the Dax in Russian)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/GorpTest"
                    >
                      The Gorp Test
                    </a>
                    <br />(5 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/MemoryTest"
                    >
                      The Memory Test
                    </a>
                    <br />(3 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/Puntastic"
                    >
                      Puntastic
                    </a>
                    <br />(3+ minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/EmotionSense/index.html"
                    >
                      Emotion Sense
                    </a>
                    <br />(5 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/DramaQueen/index.html"
                    >
                      Drama Queen
                    </a>
                    <br />(5 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/VideoTest/index.html"
                    >
                      The Video Test
                    </a>
                    <br />(15-20 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/ThatKindofPerson/index.html"
                    >
                      That Kind of Person
                    </a>
                    <br />(5 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/TheCommunicationGame/index.html"
                    >
                      The Communication Game
                    </a>
                    <br />(2-4 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/PronounSleuth/"
                    >
                      Pronoun Sleuth
                    </a>
                    <br />(5-10 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/LanguageAndMemory/index.html"
                    >
                      The Language & Memory Test
                    </a>
                    <br />(10-15 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/Diva/index.html"
                    >
                      Дива
                    </a>
                    <br />(5-10 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/CollectingFancyArt/index.html"
                    >
                      Collecting Fancy Art
                    </a>
                    <br />(10-15 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/FindingExplanations/index.html"
                    >
                      Finding Explanations
                    </a>
                    <br />(10 minutes)
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/Korean"
                    >
                      Korean
                    </a>
                    <br />
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/JapanesePronouns"
                    >
                      Japanese Pronouns
                    </a>
                    <br />
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/VSTMTime"
                    >
                      VSTM Time
                    </a>
                    <br />
                  </p>

                  <p className={s.mb25}>
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/WhoAmITalkingAbout/"
                    >
                      Who Am I Talking About?
                    </a>
                    <br />
                  </p>
                  <hr />
                  <br />
                </div>
              </Col>
            </Row>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default Archive;
/* eslint-disable max-len */
