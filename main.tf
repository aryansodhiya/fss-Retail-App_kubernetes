# Configure the AWS provider
provider "aws" {
  region = "ap-south-1" # Your EKS cluster's region
}

# Data source to fetch existing EKS Cluster
# We assume your EKS cluster 'fss-Retail-App_kubernetes' already exists
data "aws_eks_cluster" "selected" {
  name = "fss-Retail-App_kubernetes"
}

# Data source to fetch existing VPC (replace with your VPC ID)
data "aws_vpc" "selected" {
  filter {
    name   = "tag:Name"
    values = ["fss-retail-vpc"] # IMPORTANT: Replace with the actual Name tag of your VPC
    #id = "vpc-****661e8e122bc9e" # If you prefer to use the VPC ID directly
  }
}

# Data sources to fetch existing subnets for the EKS nodes
# Replace these with the actual IDs or Name tags of your private subnets where EKS nodes should run
# You typically need at least two subnets in different AZs for high availability.
data "aws_subnet" "private_subnet_1" {
  filter {
    name   = "tag:Name"
    values = ["fss-retail-subnet-a"] # IMPORTANT: Replace with actual Name tag
  }
  vpc_id = data.aws_vpc.selected.id
}

data "aws_subnet" "private_subnet_2" {
  filter {
    name   = "tag:Name"
    values = ["fss-retail-subnet-b"] # IMPORTANT: Replace with actual Name tag
  }
  vpc_id = data.aws_vpc.selected.id
}



# IAM Role for EKS Worker Nodes
# This role will be assumed by your EC2 instances acting as EKS worker nodes.
resource "aws_iam_role" "eks_node_role" {
  name = "fss-Retail-App_kubernetes-2" # Name for your node group IAM role

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })
}

# Attach required AWS managed policies to the node role
resource "aws_iam_role_policy_attachment" "eks_node_policy_worker_node" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_node_policy_container_registry" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_node_policy_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

# EKS Managed Node Group
resource "aws_eks_node_group" "fss_app_node_group" {
  cluster_name    = data.aws_eks_cluster.selected.name
  node_group_name = "fss-app-default-nodes" # Name for your node group
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = [data.aws_subnet.private_subnet_1.id, data.aws_subnet.private_subnet_2.id] # Use your selected subnets

  instance_types = ["t3.medium"] # IMPORTANT: Choose an instance type. t3.medium is a good start.
                                 # Consider t3.large or m5.large for more demanding apps.

  scaling_config {
    desired_size = 2 # IMPORTANT: Set your desired number of nodes (e.g., 1 or 2)
    max_size     = 3 # Maximum nodes in the ASG
    min_size     = 1 # Minimum nodes in the ASG
  }

  # Ensure the node group depends on the IAM role attachments
  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy_worker_node,
    aws_iam_role_policy_attachment.eks_node_policy_container_registry,
    aws_iam_role_policy_attachment.eks_node_policy_cni,
  ]

  # Optional: Labels to apply to the nodes
  # labels = {
  #   "environment" = "dev"
  #   "purpose"     = "fss-retail-app"
  # }

  # Optional: Tags to apply to the EC2 instances launched by the node group
  tags = {
    "Name"                               = "fss-Retail-App-EKS-Node"
    "eks:cluster-name"                   = data.aws_eks_cluster.selected.name
    "eks:nodegroup-name"                 = "fss-app-default-nodes"
    # These two tags are crucial for the EKS autoscaler to recognize the nodes if you use it later.
  }
}