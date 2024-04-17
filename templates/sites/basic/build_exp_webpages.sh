# Navigate to the experiments directory
cd ../../experiments

# Iterate over each subdirectory in the current directory
for dir in */
do
  # Navigate to the specific path in the subdirectory
  cd "${dir}/src/web page"

  # Run yarn install
  echo "Running 'yarn install' in $(pwd)"
  yarn install

  # Run yarn build
  echo "Running 'yarn build' in $(pwd)"
  yarn build

  # Return to the experiments directory
  cd - > /dev/null
done
