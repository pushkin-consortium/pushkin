const dockerLogin = async () => {
  //get dockerhub id
  let DHID;
  try {
    let config = await loadConfig(path.join(process.cwd(), "pushkin.yaml"));
    DHID = config.DockerHubID;
  } catch (e) {
    console.error(`Unable to load pushkin.yaml`);
    throw e;
  }

  if (DHID == "") {
    throw new Error(`Your DockerHub ID has disappeared from pushkin.yaml.\n I am not sure how that happened.\n
      If you run '$ pushkin setDockerHub' and then retry aws update, it might work. Depending on exactly why your DockerHub ID wasn't in pushkin.yaml.`);
  }

  try {
    console.log(`Confirming docker login.`);
    execSync(`cat .docker | docker login --username ${DHID} --password-stdin`);
  } catch (e) {
    console.error(`Automatic login to DockerHub failed. This might be because your ID or password are wrong.\n
      Try running '$ pushkin setDockerHub' and reset then try again.\n
      If that still fails, report an issue to Pushkin on GitHub. In the meantime, you can probably login manually\n
      by typing '$ docker login' into the console.\n Provide your username and password when asked.\n
      Then try '$ pushkin aws update' again.`);
    process.exit();
  }

  return DHID;
};

const updateDocker = async () => {
  let DHID = await dockerLogin();

  try {
    return publishToDocker(DHID);
  } catch (e) {
    console.error("Unable to publish images to DockerHub");
    throw e;
  }
};