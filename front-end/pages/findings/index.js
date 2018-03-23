/**
 * React Static Boilerplate
 * https://github.com/kriasoft/react-static-boilerplate
 *
 * Copyright © 2015-present Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import * as f from "react-foundation";
import * as b from "react-bootstrap";
import React, { PropTypes } from "react";
import s from "./styles.css";

class FindingPage extends React.Component {
  constructor() {
    super();
    this.state = {
      whichenglish: false,
      thatkindofperson: false,
      sliktopoz: false,
      daxstory: false,
      puntastic: false,
      birthorder: false,
      memorytest: false,
      whitebear: false,
      actions: false
    };
    this.updateDimensions = this.updateDimensions.bind(this);
  }

  componentWillMount() {
    window.addEventListener("resize", this.updateDimensions);
  }

  componentDidMount() {
    document.title = "Games With Words";
    this.updateDimensions();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateDimensions);
  }

  updateDimensions() {
    if (window.innerWidth < 992) {
      this.setState({
        mobile: true,
        border: { borderBottom: "dashed #a9a9a9" }
      });
    } else {
      this.setState({
        mobile: false,
        border: {
          borderRight: "dashed #a9a9a9",
          minHeight: this.refs.list.offsetHeight + 20
        }
      });
    }
  }

  render() {
    return (
      <div style={{ marginLeft: "20px", marginRight: "20px" }}>
        <b.Image
          style={{ display: "none" }}
          onLoad={this.updateDimensions}
          src={require("../../img/favicon.ico")}
        />
        <div>
          <b.Row>
            <b.Col xs={12} md={9} style={this.state.border}>
              <div
                className={s.blurb}
                style={
                  this.state.mobile
                    ? null
                    : { marginRight: "20px", fontSize: "18px" }
                }
              >
                <p className={s.sub}>
                  Read some of the previous research findings from
                  GamesWithWords.org below. Results are also posted (more
                  frequently) on the{" "}
                  <a href="https://blog.gameswithwords.org/search?q=findings">
                    blog under the tag &quot;findings&quot;
                  </a>.
                </p>
              </div>
            </b.Col>
            <b.Col xs={12} md={3}>
              <div ref="list">
                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ whichenglish: true })}
                  >
                    Englishes of the World
                  </h1>
                </a>
                <b.Modal show={this.state.whichenglish}>
                  <b.Modal.Header>
                    <span style={{ float: "right", marginLeft: "7px" }}>
                      <a
                        style={{ color: "#000000", fontSize: "17px" }}
                        onTouchTap={() =>
                          this.setState({ whichenglish: false })
                        }
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>Englishes of the World</b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      Results of:{" "}
                      <a href="http://gameswithwords.org/WhichEnglish">
                        WhichEnglish?
                      </a>
                    </p>
                    <p>
                      How do your grammar intuitions depend on when and where
                      you learned English? Participants took a short grammar
                      quiz, which we are using to understand how grammar differs
                      in different parts of the English-speaking world (USA,
                      Ireland, Australia, etc.). We are also investigating how
                      grammar is different for people who learn English later in
                      life: Do they make different mistakes if their first
                      language is German as opposed to Japanese?
                    </p>
                    <p>
                      For a discussion of the purpose and background of the
                      study, see this<a href="https://blog.gameswithwords.org/which-english-the-science-part-1-5cf4df2836b1">
                        {" "}
                        blog post
                      </a>.
                    </p>
                    <p>
                      Check out{" "}
                      <a
                        href="http://gameswithwords.org/WhichEnglish/dialect_results.html"
                        target="_blank"
                      >
                        this visualization
                      </a>{" "}
                      of our results so far. This visualization will be updated
                      as more results come in, so check back later.
                    </p>
                    <p>Check back soon. Analysis is ongoing...</p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ whichenglish: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ thatkindofperson: true })}
                  >
                    The king frightened the page because he...
                  </h1>
                </a>
                <b.Modal show={this.state.thatkindofperson}>
                  <b.Modal.Header>
                    <span style={{ float: "right", marginLeft: "7px" }}>
                      <a
                        style={{ color: "#000000", fontSize: "17px" }}
                        onTouchTap={() =>
                          this.setState({ thatkindofperson: false })
                        }
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>
                      The king frightened the page because he...
                    </b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      Results of:{" "}
                      <a href="http://gameswithwords.org/ThatKindofPerson/index.html">
                        That Kind of Person
                      </a>
                    </p>
                    <p>
                      This experiment was one in a line of pronoun experiments,
                      most of which were run on Amazon Mechanical Turk. Early
                      summaries of the findings can be found{" "}
                      <a href="https://blog.gameswithwords.org/findings-that-kind-of-person-9c43159212d1">
                        here
                      </a>{" "}
                      and{" "}
                      <a href="http://gameswithwords.fieldofscience.com/2010/10/findings-causality-implicit-in-language.html">
                        here
                      </a>. This experiment was bundled into a larger paper on
                      pronouns which will be published somewhere in 2013/2014.
                      You can read a description of the paper, and find a link
                      to the paper{" "}
                      <a href="https://blog.gameswithwords.org/findings-the-role-of-world-knowledge-in-pronoun-interpretation-c8900b033c7c">
                        here
                      </a>.
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() =>
                        this.setState({ thatkindofperson: false })
                      }
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ sliktopoz: true })}
                  >
                    How does pronoun interpretation compare across languages?
                  </h1>
                </a>
                <b.Modal show={this.state.sliktopoz}>
                  <b.Modal.Header>
                    <span style={{ float: "right", marginLeft: "7px" }}>
                      <a
                        style={{ color: "#000000", fontSize: "17px" }}
                        onTouchTap={() => this.setState({ sliktopoz: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>
                      How does pronoun interpretation compare across languages?
                    </b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      Results of:{" "}
                      <a href="http://gameswithwords.org/Sliktopoz/index.html">
                        Угадай кто сликтопоз
                      </a>,<a href="JapanesePronouns/index.html"> 代名詞刑事</a>
                    </p>
                    <p>
                      In these studies, we asked whether the relationship
                      between verb meaning and pronoun interpretation that we
                      reported previously was the same in other languages (for
                      background,{" "}
                      <a onTouchTap={() => this.setState({ daxstory: true })}>
                        see this
                      </a>). Many previous studies have found that certain verbs
                      affect the interpretation of pronouns:
                    </p>
                    <p>(1) Sally frightens Mary because she... </p>
                    <p>(2) Sally loves Mary because she... </p>
                    <p>
                      Although the pronoun is ambiguous, most people guess that
                      she refers to Sally in (1) but Mary in (2). The question
                      was whether verbs with similar meanings in different
                      languages have the same effect.
                    </p>
                    <p>
                      Deciding what it means for two verbs in different
                      languages to mean &quot;the same thing&quot; is difficult
                      and stymied previous research. However,{" "}
                      <a onTouchTap={() => this.setState({ daxstory: true })}>
                        our recent results
                      </a>{" "}
                      showing that entire groups of verbs reliably have the same
                      effect on pronouns simplified the issue: we just needed to
                      identify thesame groups of verbs across languages, which
                      actually turns out to be easier (see the paper for
                      details).
                    </p>
                    <p>
                      {" "}
                      We collected new data in Japanese, Russian, and Mandarain
                      (the Japanese and Russian studies were conducted on this
                      website) and re-analyzed older results from English,
                      Dutch, Italian, and Spanish. Our results were striking: we
                      found the exact same results in each of the languages we
                      looked at.
                    </p>
                    <p>
                      A more comprehensive description is{" "}
                      <a href="https://blog.gameswithwords.org/findings-linguistic-universals-in-pronoun-resolution-cd34332969fd">
                        here
                      </a>.
                    </p>
                    <p>
                      The paper is available{" "}
                      <a href="http://gameswithwords.org/Hartshorne/papers/HartshorneSudoUruwashi_ICxLing.pdf">
                        here
                      </a>.
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ sliktopoz: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ daxstory: true })}
                  >
                    What do verbs have to do with pronouns?
                  </h1>
                </a>
                <b.Modal show={this.state.daxstory}>
                  <b.Modal.Header>
                    <span style={{ float: "right", marginLeft: "7px" }}>
                      <a
                        style={{ color: "#000000", fontSize: "17px" }}
                        onTouchTap={() => this.setState({ daxstory: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>
                      What do verbs have to do with pronouns?
                    </b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      Results of:{" "}
                      <a href="http://gameswithwords.org/DaxStory/index.html">
                        Find the Dax
                      </a>
                    </p>
                    <p>
                      Unlike a proper name (Jane Austen), a pronoun (she) can
                      refer to a different person just about every time it is
                      uttered. While we occasionally get bogged down in
                      conversation trying to interpret a pronoun (Wait! Who are
                      you talking about?), for the most part we sail through
                      sentences with pronouns, not even noticing the ambiguity.{" "}
                    </p>
                    <p>
                      We have been running a number of studies on pronoun
                      understanding. One line of work looks at a peculiar
                      contextual effect, originally discovered by Garvey and
                      Caramazza in the mid-70s:
                    </p>
                    <p> (1) Sally frightens Mary because she... </p>
                    <p>(2) Sally loves Mary because she... </p>
                    <p>
                      Although the pronoun is ambiguous, most people guess that
                      she refers to Sally in (1) but Mary in (2). That is, the
                      verb used (frightens, loves) seems to affect pronoun
                      resolution.
                    </p>
                    <p>
                      From the beginning, most if not all researchers agreed
                      that this must have something to do with how verbs encode
                      causality: &quot;Sally frightens Mary&quot; suggests that
                      Sally is the cause, which is why you then think that
                      &quot;because she…&quot; refers to Sally, and vice versa
                      for &quot;Sally loves Mary&quot;.
                    </p>
                    <p>
                      {" "}
                      The problem was finding a predictive theory: which verbs
                      encode causality which way? A number of theories have been
                      proposed, but the data did not clearly support one over
                      another. In part, the problem was that we had data on a
                      small number of verbs, and as mathematicians like to tell
                      us, you can draw an infinite number of lines a single
                      point (and create many different theories to describe a
                      small amount of data).{" "}
                    </p>
                    <p>
                      With the help of visitors to this website, we collected
                      data on over 1000 verbs – far, far more than had ever been
                      studied before. We found that in fact none of the existing
                      theories worked very well. However, when we took in
                      independently developed theory of verb meaning from
                      linguistics, that actually predicted the results very
                      well.
                    </p>
                    <p>
                      For a more detailed description, see{" "}
                      <a href="http://gameswithwords.fieldofscience.com/2012/10/findings-what-do-verbs-have-to-do-with.html">
                        this blog post
                      </a>.
                    </p>
                    <p>
                      You can read the paper{" "}
                      <a href="http://gameswithwords.org/Hartshorne/papers/HartshorneSnedeker2012.pdf">
                        here
                      </a>.
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ daxstory: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ puntastic: true })}
                  >
                    What are the funniest puns?
                  </h1>
                </a>
                <b.Modal show={this.state.puntastic}>
                  <b.Modal.Header>
                    <span style={{ float: "right", marginLeft: "7px" }}>
                      <a
                        style={{ color: "#000000", fontSize: "17px" }}
                        onTouchTap={() => this.setState({ puntastic: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>What are the funniest puns?</b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      Results from:{" "}
                      <a href="http://gameswithwords.org/Puntastic/index.html">
                        Puntastic
                      </a>
                    </p>
                    <p>
                      Terrible what makes one pun funny and another terrible?
                      Beyond pure human interest, this is a scientific question.
                      As a prelude to more detailed investigation of puns,
                      GamesWithWords started by collecting a large body (2000+)
                      of pun-based jokes and asking people to judge how funny
                      each one was. In the future, we and other researchers can
                      use these data to design new experiments.{" "}
                    </p>
                    <p>
                      We can also provide preliminary answers to some
                      interesting questions. For instance, it was not the case
                      that men like puns more than women or women than men.
                      Because there is anecdotal evidence that people with
                      autism particularly like puns, we included a question
                      asking whether it's participant was &quot;good at social
                      situations&quot; (we thought that people might feel more
                      comfortable answering this in direct question); there was
                      no difference in pun-liking based on this question either,
                      which is either evidence against the hypothesis and puns
                      and autism or just a result of our imperfect question.
                    </p>
                    <p>
                      For additional information and a list of the five best and
                      five worst puns, see{" "}
                      <a href="https://blog.gameswithwords.org/crowdsourcing-my-data-analysis-345d393108c5">
                        this report on the blog
                      </a>. To obtain the actual data, see this<a href="http://gameswithwords.org/Puntastic/results.html">
                        {" "}
                        technical report
                      </a>.
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ puntastic: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ birthorder: true })}
                  >
                    Birth Order and Love
                  </h1>
                </a>
                <b.Modal show={this.state.birthorder}>
                  <b.Modal.Header>
                    <span style={{ float: "right", marginLeft: "7px" }}>
                      <a
                        style={{ color: "#000000", fontSize: "17px" }}
                        onTouchTap={() => this.setState({ birthorder: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>Birth Order and Love</b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      Results from:{" "}
                      <a href="http://gameswithwords.org/BirthOrder/index.html">
                        The Birth Order Survey
                      </a>
                    </p>
                    <p>
                      Pop psychology assures us that your birth order (oldest,
                      middle, youngest, only) has a major effect on your
                      personality. Many books have been written on the subject.
                      It might surprise you, then, that scientists are not only
                      not sure how birth order affects personality, they are
                      divided on the question of whether birth order has{" "}
                      <em>any</em> effect on personality.{" "}
                    </p>
                    <p>
                      In this study, we asked people about their own birth order
                      and the birth order of their best friends and significant
                      others, as well as the birth order of their parents. It
                      turns out that people are slightly more likely to have a
                      close friend or significant other/spouse of the same birth
                      order. We think this suggests that birth order does in
                      fact affect personality, though no doubt the debate will
                      continue. It's important that the method we used --
                      especially the use of the Internet -- avoided some of the
                      typical confounds of birth order studies. <br />
                    </p>
                    <p>
                      <a href="http://gameswithwords.org/Hartshorne/papers/BirthOrder.pdf">
                        Published findings (journal article).
                      </a>
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ birthorder: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ memorytest: true })}
                  >
                    Why is Visual Memory so Lousy?
                  </h1>
                </a>
                <b.Modal show={this.state.memorytest}>
                  <b.Modal.Header>
                    <span style={{ float: "right", marginLeft: "7px" }}>
                      <a
                        style={{ color: "#000000", fontSize: "17px" }}
                        onTouchTap={() => this.setState({ memorytest: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>
                      Why is Visual Memory so Lousy?
                    </b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      Results from:{" "}
                      <a href="http://gameswithwords.org/MemoryTest/index.html">
                        The Memory Test
                      </a>
                    </p>
                    <p>
                      Visual working memory refers to our ability to remember
                      what we see for short periods of time.&nbsp; For instance,
                      an artist uses her visual working memory to paint a
                      picture -- she must remember the image she wants to
                      reproduce long enough to paint.
                    </p>
                    <p>
                      {" "}
                      Visual working memory appears to be much more limited than
                      working memory for words. The typical educated adult in
                      America can remember<a href="http://en.wikipedia.org/wiki/The_Magical_Number_Seven,_Plus_or_Minus_Two">
                        {" "}
                        seven words at a time
                      </a>{" "}
                      but only the look of{" "}
                      <a href="http://www.psychology.uiowa.edu/faculty/Luck/lucklab/pdfs/Luck_1997_Nature.pdf">
                        four different objects
                      </a>{" "}
                      (and even that number is controversial). Some people have
                      managed to learn tricks so as to remember{" "}
                      <a href="http://www.jstor.org/pss/3233525">
                        dozens of words at a time
                      </a>, but no similar feats have reported for visual
                      memory.{" "}
                    </p>
                    <p>
                      In this paper, which included data from one of our online
                      studies, we tried to determine if the problem is that
                      visual memory is more susceptible to a particular type of
                      interference (proactive interference). It's not. We'll
                      have to look elsewhere for an answer.
                    </p>
                    <p>
                      Links:
                      <ul style={{ listStyle: "none" }}>
                        <li className={s.ul}>
                          <a href="http://www.plosone.org/article/fetchArticle.action?articleURI=info:doi/10.1371/journal.pone.0002716#s5">
                            Published findings
                          </a>{" "}
                          (journal article)
                        </li>
                        <li className={s.ul}>
                          <a href="http://coglanglab.blogspot.com/2008/07/results-from-experiment-time-course-of.html">
                            A discussion of the study in our blog
                          </a>
                        </li>
                      </ul>
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ memorytest: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ whitebear: true })}
                  >
                    Don't Think about a White Bear
                  </h1>
                </a>
                <b.Modal show={this.state.whitebear}>
                  <b.Modal.Header>
                    <span style={{ float: "right", marginLeft: "7px" }}>
                      <a
                        style={{ color: "#000000", fontSize: "17px" }}
                        onTouchTap={() => this.setState({ whitebear: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>
                      Don't Think about a White Bear
                    </b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>Try not to think about a white bear. </p>
                    <p>
                      If you are<a href="http://www.rice.edu/sallyport/2004/spring/whoswho/whitebear.html">
                        {" "}
                        like the typical person
                      </a>, you just thought of a white bear. In fact, it is
                      very hard to successfully try to not think about
                      something. A recent study (<a href="http://psycnet.apa.org/index.cfm?fa=buy.optionToBuy&amp;id=2006-04604-011&amp;CFID=4312209&amp;CFTOKEN=90966450">
                        Tsal &amp; Makovski, 2006
                      </a>) extended this finding to vision: trying to ignore
                      part of your visual field (such as everything on the left)
                      actually causes you to pay more attention to it.{" "}
                    </p>
                    <p>
                      The way they actually tested this was to surprise
                      participants by flashing a picture in the ignored area
                      (such as on the left) so rapidly it was hard to make out.
                      If people were paying extra attention to that area, they
                      would be able to make out more of the image. To get enough
                      data, they 'surprised' each participant a number of times,
                      so it's not clear whether the participants were really
                      surprised. So we (Makovski &amp; Hartshorne) tried running
                      a similar experiment on the Web, where each person would
                      be surprised only once. The reuslts were unfortunately not
                      clear enough for publication, but we did write up a brief
                      report, which you can access below:
                    </p>
                    <p>
                      <a href="http://gameswithwords.org/WhiteBear/WhiteBear.pdf">
                        Official Lab Report
                      </a>
                      <br />
                      <a href="http://gameswithwords.org/WhiteBear/results.html">
                        Lab Report in Everyday Language
                      </a>
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ whitebear: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    style={{ marginBottom: "50px" }}
                    className={s.title}
                    onTouchTap={() => this.setState({ actions: true })}
                  >
                    The Meaning of Actions
                  </h1>
                </a>
                <b.Modal show={this.state.actions}>
                  <b.Modal.Header>
                    <span style={{ float: "right", marginLeft: "7px" }}>
                      <a
                        style={{ color: "#000000", fontSize: "17px" }}
                        onTouchTap={() => this.setState({ actions: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>The Meaning of Actions</b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      The purpose of this study was to collect native English
                      speaker’s intuitions about the extent that motor movements
                      may determine the meaning of most common English verbs.
                      The standard linguistic position is that the meaning of a
                      verb is determined by its argument structure – that is,
                      the abstract roles it denotes in a sentence. For instance,
                      the verb “to give” presupposes an agent (the giver), a
                      patient (the givee) and transfer of possession.
                    </p>
                    <p>
                      However, recent brain imaging and behavioral evidence
                      suggests that, unexpectedly, premotor cortex is involved
                      in the processing of action words and sentences. A recent
                      Transcranial Magnetic Stimulation (TMS) study demonstrated
                      that in fact, there may be a causal link between motor
                      representations and verbs. When a hand-related area of
                      motor cortex is deactivated, people are slower to
                      recognize hand-related verbs (such as “to pick”) than,
                      say, foot-related words (“to kick”) – and vice versa. This
                      intriguing finding has led some researchers to conclude
                      that the meaning of certain action words is the process of
                      activating relevant motor programs, and does not have an
                      abstract component.
                    </p>
                    <p>
                      We are in the process of testing the hypothesis that motor
                      programs do not exhaust the meaning of even the most
                      common English verbs, let alone the majority of action
                      words. People al over the world have rated these verbs
                      according to whether there is a typical motor motion
                      associated with the verb, whether that motion is
                      definitive of the action (or the action can be carried out
                      in other ways), whether the result of the motion is
                      important or not, etc. Such approach is atheoretical (that
                      is, we are not motivated by linguistic categories of verbs
                      and want English speakers tell us what they think). Then
                      we take verbs that score the highest on the motor
                      typicality scale and do a series of experiments. These
                      experiments will show whether motor motions will determine
                      the verbs’ meaning even for the most highly rated action
                      words.
                    </p>
                    <p>
                      Thus, "The Meaning of Actions" is not a typical experiment
                      in the sense of testing a hypothesis. Rather, it was part
                      of a method to develop test materials for other
                      experiments to be conducted by the{" "}
                      <a href="https://software.rc.fas.harvard.edu/lds/research/snedeker/">
                        Snedeker Lab
                      </a>{" "}
                      at Harvard. The development of stimuli is a critical part
                      of most cognitive research; your results are only as good
                      as the method used to obtain them. Stay tuned at that site
                      for results from these ongoing studies. Thank you again to
                      everybody who participated.
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ actions: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>
              </div>
            </b.Col>
          </b.Row>
        </div>
      </div>
    );
  }
}

export default FindingPage;
