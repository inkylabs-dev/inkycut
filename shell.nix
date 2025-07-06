{ pkgs ? import <nixpkgs> { config.allowUnfree = true; } }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs
    pkgs.stripe-cli
    pkgs.flyctl
  ];
  shellHook = ''
    export PATH=$PATH:$HOME/.local/bin;
  '';
}
