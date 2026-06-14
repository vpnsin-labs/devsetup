# Utility Scripts & Command Reference

Quick reference for commands installed or configured by devsetup.

---

## devsetup

```bash
npx @vpnsin-lab/devsetup                    # interactive profile selection
npx @vpnsin-lab/devsetup --js               # minimal JavaScript dev
npx @vpnsin-lab/devsetup --web              # web development profile
npx @vpnsin-lab/devsetup --mobile           # mobile development
npx @vpnsin-lab/devsetup --backend          # backend / API development
npx @vpnsin-lab/devsetup --devops           # Kubernetes / DevOps
npx @vpnsin-lab/devsetup --full-stack       # everything
npx @vpnsin-lab/devsetup --full-stack --yes # everything, no prompts
npx @vpnsin-lab/devsetup --dotfiles         # install dotfile templates
npx @vpnsin-lab/devsetup --docs ./docs      # generate documentation
npx @vpnsin-lab/devsetup --dry-run --web    # preview commands without running
```

---

## Node.js / fnm

```bash
fnm list-remote              # list all available Node.js versions
fnm install 22               # install Node.js v22
fnm install --lts            # install latest LTS
fnm use 22                   # use version in current shell
fnm default 22               # set global default
fnm list                     # show installed versions
fnm current                  # show active version
fnm env                      # print shell integration code
```

---

## pnpm

```bash
pnpm install                 # install dependencies
pnpm add <package>           # add a dependency
pnpm add -D <package>        # add a dev dependency
pnpm remove <package>        # remove a package
pnpm run <script>            # run a script from package.json
pnpm dev                     # shorthand for pnpm run dev
pnpm build                   # shorthand for pnpm run build
pnpm test                    # shorthand for pnpm run test
pnpm dlx <package>           # run a package without installing (like npx)
pnpm update --interactive    # update deps interactively
pnpm audit                   # check for vulnerabilities
pnpm store prune             # clean the global store cache
```

---

## Git

```bash
git status -sb               # compact status
git log --oneline --graph    # visual branch history
git diff HEAD                # unstaged changes
git diff --staged            # staged changes
git stash push -m "wip"      # stash with a name
git stash list               # list stashes
git stash pop                # apply most recent stash
git reset --soft HEAD~1      # undo last commit, keep changes staged
git commit --amend           # edit last commit (don't amend pushed commits)
git bisect start             # start binary search for a bug
git reflog                   # recover lost commits
```

Aliases installed by `.gitconfig` template:

| Alias | Expands to |
| ----- | ---------- |
| `git st` | `git status -sb` |
| `git co` | `git checkout` |
| `git br` | `git branch -vv` |
| `git lg` | `git log --oneline --graph --decorate --all` |
| `git undo` | `git reset --soft HEAD~1` |
| `git save` | `git stash push -m` |

---

## GitHub CLI (gh)

```bash
gh auth login                # authenticate
gh auth status               # verify auth
gh repo clone owner/repo     # clone a repo
gh repo create               # create a new repo
gh pr create --web           # open PR creation in browser
gh pr list                   # list open PRs
gh pr checkout 42            # check out PR #42
gh pr merge 42               # merge PR #42
gh issue list                # list open issues
gh issue create              # create an issue
gh run list                  # list recent CI runs
gh run watch                 # watch a running CI job
gh ssh-key add ~/.ssh/id_ed25519.pub --title "My key"
```

---

## Docker

```bash
docker ps                    # running containers
docker ps -a                 # all containers
docker images                # local images
docker pull nginx            # pull an image
docker run -p 3000:3000 myapp # run a container
docker exec -it <name> sh    # shell into a container
docker logs -f <name>        # stream container logs
docker stop <name>           # stop gracefully
docker rm <name>             # remove container
docker rmi <image>           # remove image
docker system prune -af      # remove all stopped containers and unused images

# Compose
docker compose up -d         # start services in background
docker compose down          # stop and remove services
docker compose logs -f       # stream logs
docker compose ps            # show service status
docker compose exec <svc> sh # shell into a service
docker compose build         # rebuild images
```

---

## kubectl

```bash
kubectl get pods                         # list pods in current namespace
kubectl get pods -A                      # all namespaces
kubectl get services                     # list services
kubectl get deployments                  # list deployments
kubectl describe pod <name>              # pod details and events
kubectl logs <pod> -f                    # stream pod logs
kubectl exec -it <pod> -- sh             # shell into pod
kubectl apply -f deployment.yaml         # apply manifest
kubectl delete -f deployment.yaml        # delete resources from manifest
kubectl port-forward svc/<name> 3000:80  # forward a service port locally
kubectl config get-contexts              # list kubeconfig contexts
kubectl config use-context <name>        # switch cluster/namespace
kubectl config set-context --current --namespace <ns>  # set default namespace
```

---

## minikube

```bash
minikube start               # start local cluster
minikube start --cpus 4 --memory 8192  # with resource limits
minikube stop                # stop cluster
minikube delete              # destroy cluster
minikube status              # check cluster status
minikube dashboard           # open Kubernetes dashboard in browser
minikube service <name>      # open service URL in browser
eval $(minikube docker-env)  # use minikube's Docker (build images locally)
```

---

## Helm

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update             # refresh chart index
helm search repo nginx       # search for a chart
helm install my-nginx bitnami/nginx        # install chart
helm upgrade my-nginx bitnami/nginx        # upgrade release
helm list                    # list installed releases
helm uninstall my-nginx      # uninstall
helm status my-nginx         # show release status
helm template my-chart ./    # render templates locally
helm lint ./                 # lint a chart directory
```

---

## Supabase CLI

```bash
supabase login               # authenticate
supabase init                # initialise Supabase in current project
supabase start               # start local Supabase stack (Docker)
supabase stop                # stop local stack
supabase status              # show URLs and service status
supabase db reset            # reset local DB and re-apply migrations
supabase migration new <name>  # create a new migration
supabase db push             # push migrations to remote project
supabase gen types typescript  # generate TypeScript types from schema
supabase functions new <name>  # create an Edge Function
supabase functions serve     # run Edge Functions locally
```

---

## MongoDB

```bash
mongosh                      # connect to local MongoDB
mongosh "mongodb://localhost:27017/mydb"   # connect to specific DB

# Inside mongosh:
show dbs                     # list databases
use mydb                     # switch database
show collections             # list collections
db.users.find()              # query a collection
db.users.find().limit(5)     # limit results
db.users.insertOne({ name: "Alice" })
db.users.deleteOne({ name: "Alice" })

# Start/stop (macOS Homebrew):
brew services start mongodb-community@8.0
brew services stop mongodb-community@8.0
brew services list
```

---

## AWS CLI

```bash
aws configure                # interactive setup (key, secret, region)
aws configure list           # show current config
aws s3 ls                    # list S3 buckets
aws s3 cp file.txt s3://my-bucket/
aws ec2 describe-instances
aws logs tail /aws/lambda/my-function --follow
aws sts get-caller-identity  # verify which account you're using
```

---

## Proxy helpers (from `.zshrc` template)

```bash
proxy_on                     # enable http_proxy / https_proxy env vars
proxy_on http://myproxy:80   # with a custom proxy URL
proxy_off                    # unset proxy env vars
proxy_status                 # show current proxy settings
```
