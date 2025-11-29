#!/bin/bash

# Version bump script for opencircle monorepo
# Updates both package.json and pyproject.toml files
# Usage: ./bump-version.sh [--major|--minor|--patch|--version X.X.X]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to validate semver version
validate_version() {
    local version=$1
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Invalid version format: $version. Expected X.X.X"
        exit 1
    fi
}

# Function to bump version
bump_version() {
    local current_version=$1
    local bump_type=$2

    IFS='.' read -ra VERSION_PARTS <<< "$current_version"
    local major=${VERSION_PARTS[0]}
    local minor=${VERSION_PARTS[1]}
    local patch=${VERSION_PARTS[2]}

    case $bump_type in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch")
            patch=$((patch + 1))
            ;;
    esac

    echo "$major.$minor.$patch"
}

# Function to update package.json version
update_package_version() {
    local package_file=$1
    local new_version=$2

    if [[ -f "$package_file" ]]; then
        # Use node to update JSON properly
        node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('$package_file', 'utf8'));
            pkg.version = '$new_version';
            fs.writeFileSync('$package_file', JSON.stringify(pkg, null, 2) + '\n');
        "
        print_info "Updated $(basename $(dirname $package_file))/$(basename $package_file) to $new_version"
    fi
}

# Function to update pyproject.toml version
update_pyproject_version() {
    local pyproject_file=$1
    local new_version=$2

    if [[ -f "$pyproject_file" ]]; then
        # Use sed to update the version line in pyproject.toml
        sed -i '' "s/^version = \".*\"/version = \"$new_version\"/" "$pyproject_file"
        print_info "Updated $(basename $(dirname $pyproject_file))/$(basename $pyproject_file) to $new_version"
    fi
}

# Main script logic
main() {
    local bump_type=""
    local custom_version=""

    # Parse arguments
    case "${1:-}" in
        --major)
            bump_type="major"
            ;;
        --minor)
            bump_type="minor"
            ;;
        --patch)
            bump_type="patch"
            ;;
        --version)
            if [[ -z "${2:-}" ]]; then
                print_error "Version argument is required when using --version"
                echo "Usage: $0 --version X.X.X"
                exit 1
            fi
            custom_version="$2"
            validate_version "$custom_version"
            ;;
        *)
            print_error "Invalid argument: ${1:-}"
            echo "Usage: $0 [--major|--minor|--patch|--version X.X.X]"
            exit 1
            ;;
    esac

    print_info "Starting version bump process..."

    # Get all package.json and pyproject.toml files in the monorepo, excluding node_modules and other dependency directories
    package_files=$(find "$(dirname "$0")/.." -name "package.json" -type f -not -path "*/node_modules/*" -not -path "*/.pnpm/*" -not -path "*/dist/*" -not -path "*/build/*")
    pyproject_files=$(find "$(dirname "$0")/.." -name "pyproject.toml" -type f -not -path "*/node_modules/*" -not -path "*/.pnpm/*" -not -path "*/dist/*" -not -path "*/build/*")

    if [[ -z "$package_files" && -z "$pyproject_files" ]]; then
        print_error "No package.json or pyproject.toml files found"
        exit 1
    fi

    # Get current version from root package.json (fallback to pyproject.toml if no root package.json)
    root_package="$(dirname "$0")/../package.json"
    if [[ -f "$root_package" ]]; then
        current_version=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$root_package', 'utf8')).version)")
    else
        # Fallback to pyproject.toml
        root_pyproject="$(dirname "$0")/../pyproject.toml"
        if [[ -f "$root_pyproject" ]]; then
            current_version=$(grep "^version = " "$root_pyproject" | sed 's/version = "//' | sed 's/"//')
        else
            print_error "No root package.json or pyproject.toml found to determine current version"
            exit 1
        fi
    fi

    print_info "Current version: $current_version"

    # Determine new version
    if [[ -n "$custom_version" ]]; then
        new_version="$custom_version"
    else
        new_version=$(bump_version "$current_version" "$bump_type")
    fi

    print_info "New version will be: $new_version"

    # Confirm the change
    read -p "Do you want to proceed with updating all packages to version $new_version? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Version bump cancelled"
        exit 0
    fi

    # Update all package.json files
    while IFS= read -r package_file; do
        update_package_version "$package_file" "$new_version"
    done <<< "$package_files"

    # Update all pyproject.toml files
    while IFS= read -r pyproject_file; do
        update_pyproject_version "$pyproject_file" "$new_version"
    done <<< "$pyproject_files"

    print_info "Version bump completed successfully!"
    print_info "All package.json and pyproject.toml files have been updated to version $new_version"
    print_info "Next git commands to run:"
    echo "  git add ."
    echo "  git commit -m \"chore: bump version to $new_version\""
    echo "  git tag v$new_version"
    echo "  git push origin main --tags"
}

# Run main function with all arguments
main "$@"
