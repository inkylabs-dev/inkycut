{ pkgs ? import <nixpkgs> { config.allowUnfree = true; } }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs
    pkgs.stripe-cli
  ];
  shellHook = ''
    export PATH=$PATH:$HOME/.local/bin;
  '';
}
