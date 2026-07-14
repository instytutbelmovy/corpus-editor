using System.Reflection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Editor;

public static class RegistrationExtensions
{
    extension(IServiceCollection serviceCollection)
    {
        public void AddConventionalServices(Assembly assembly)
        {
            foreach (var type in assembly.ExportedTypes.Where(t => t is { IsGenericType: false, IsAbstract: false }))
            foreach (var typeInterface in type.GetInterfaces().Where(i => i.Name == $"I{type.Name}"))
                serviceCollection.TryAddScoped(typeInterface, type);
        }
    }
}
