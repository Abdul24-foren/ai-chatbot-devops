output "instance_public_ip" {
  description = "Public IP address of the application host"
  value       = aws_instance.app.public_ip
}

output "instance_public_dns" {
  description = "Public DNS name of the application host"
  value       = aws_instance.app.public_dns
}

output "frontend_url" {
  description = "Frontend URL after deployment"
  value       = "http://${aws_instance.app.public_ip}"
}
