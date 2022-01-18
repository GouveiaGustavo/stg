#terraform {
#  required_version = "v1.1.3"
#  
#  backend "s3" {
#    bucket="AKIA27TIRH24743YCKE5"
#    key="p5SaZO1xQy/oPf4/7Jfh+DvM7dJZAyBS085G5CF7"
#  }
#}
provider "aws" {
  region  = "us-east-1"
}

module "network" {
  source = "C:/Users/Gustavo Gouveia/OneDrive - innovatium.com.br/Documentos/Terraform/Terraforms/Cluster/network"
  tags = {
    Env = basename(path.cwd)
  }
}
module "cluster" {
  source         = "C:/Users/Gustavo Gouveia/OneDrive - innovatium.com.br/Documentos/Terraform/Terraforms/Cluster"
  vpc_id         = module.network.vpc_id
  eks_subnet_ids = module.network.eks_subnet_ids
  cluster_name   = module.network.cluster_name

  tags = {
    Env = basename(path.cwd)
  }
}
module "worknodes" {
  source         = "C:/Users/Gustavo Gouveia/OneDrive - innovatium.com.br/Documentos/Terraform/Terraforms/Cluster/worknodes"
  eks_subnet_ids = module.network.eks_subnet_ids
  cluster_name   = module.network.cluster_name

  worknodes = 1
  worknode_desired_size = 2
  worknode_max_size = 2
  worknode_min_size = 2

  tags = {
    Env = basename(path.cwd)
  }
}